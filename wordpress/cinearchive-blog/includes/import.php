<?php
/**
 * Herramientas → Importar artículos de Cine Archive.
 *
 * Trae los artículos que había en la web (import/articles.json, generado con
 * scripts/export-articles-wp.mjs) con sus cinco idiomas, sus fechas y todos
 * sus campos. Con Polylang, cada idioma queda enlazado como traducción de los
 * demás.
 *
 * Se puede pulsar más de una vez: lo ya importado (mismo artículo y mismo
 * idioma) se salta. Sirve para traer un idioma que se dio de alta tarde en
 * Polylang sin duplicar los otros.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'admin_menu',
	function () {
		add_management_page( 'Importar artículos de Cine Archive', 'Importar artículos de Cine Archive', 'manage_options', 'ca-importar', 'ca_import_page' );
	}
);

/** Artículos del fichero de importación. */
function ca_import_data() {
	$file = CA_BLOG_DIR . 'import/articles.json';
	if ( ! is_readable( $file ) ) {
		return array();
	}
	$data = json_decode( (string) file_get_contents( $file ), true );
	return is_array( $data ) ? $data : array();
}

function ca_import_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$articles = ca_import_data();
	$langs    = ca_active_langs();
	$informe  = null;

	if ( isset( $_POST['ca_importar'] ) ) {
		check_admin_referer( 'ca_importar' );
		$informe = ca_import_run( $articles, $langs );
	}

	$faltan = array_diff( CA_LANGS, $langs );
	?>
	<div class="wrap">
		<h1>Importar artículos de Cine Archive</h1>

		<?php if ( $informe ) : ?>
			<div class="notice notice-success"><p>
				Creadas <strong><?php echo (int) $informe['creadas']; ?></strong> entradas;
				<?php echo (int) $informe['saltadas']; ?> ya estaban.
				<?php if ( $informe['traducciones'] ) : ?>
					<?php echo (int) $informe['traducciones']; ?> artículos enlazados entre idiomas.
				<?php endif; ?>
			</p></div>
		<?php endif; ?>

		<p>El fichero trae <strong><?php echo count( $articles ); ?> artículos</strong>, cada uno en hasta cinco idiomas.</p>

		<?php if ( ! function_exists( 'pll_set_post_language' ) ) : ?>
			<div class="notice notice-warning inline"><p><strong>Polylang no está activo.</strong> Solo se importará la versión en castellano. Instálalo y da de alta los cinco idiomas antes de importar si quieres las traducciones.</p></div>
		<?php elseif ( $faltan ) : ?>
			<div class="notice notice-warning inline"><p>En Polylang faltan estos idiomas: <strong><?php echo esc_html( implode( ', ', $faltan ) ); ?></strong>. Sus versiones no se importarán (puedes darlos de alta y volver a pulsar: lo ya importado se salta).</p></div>
		<?php endif; ?>

		<?php if ( ! ca_tmdb_key() ) : ?>
			<div class="notice notice-info inline"><p>Sin clave de TMDB los artículos se importan igual, pero saldrán sin portada ni carteles hasta que la pongas en <a href="<?php echo esc_url( admin_url( 'options-general.php?page=cinearchive' ) ); ?>">Ajustes → Cine Archive</a>.</p></div>
		<?php endif; ?>

		<form method="post">
			<?php wp_nonce_field( 'ca_importar' ); ?>
			<p><button type="submit" name="ca_importar" value="1" class="button button-primary">Importar (<?php echo esc_html( implode( ', ', $langs ) ); ?>)</button></p>
		</form>
	</div>
	<?php
}

/**
 * Importa. Devuelve el recuento.
 *
 * @param array $articles Contenido de articles.json.
 * @param array $langs    Idiomas a importar.
 */
function ca_import_run( $articles, $langs ) {
	$creadas      = 0;
	$saltadas     = 0;
	$traducciones = 0;

	foreach ( array_values( $articles ) as $i => $a ) {
		$slug = sanitize_title( $a['slug'] ?? '' );
		if ( '' === $slug ) {
			continue;
		}
		$ids = array();
		foreach ( $langs as $lang ) {
			$c = $a['copy'][ $lang ] ?? null;
			if ( ! $c ) {
				continue;
			}
			$existente = ca_find_imported( $slug, $lang, 'any' );
			if ( $existente ) {
				$ids[ $lang ] = $existente;
				++$saltadas;
				continue;
			}

			$post_id = wp_insert_post(
				array(
					'post_type'    => 'post',
					'post_status'  => 'publish',
					'post_author'  => get_current_user_id(),
					'post_title'   => $c['title'],
					// Polylang (gratis) no deja repetir el slug entre idiomas.
					'post_name'    => CA_DEFAULT_LANG === $lang ? $slug : $slug . '-' . $lang,
					'post_excerpt' => $c['lead'] ?? '',
					'post_content' => ca_import_blocks( $c['body'] ?? array() ),
					// El fichero va del más reciente al más antiguo. Varios comparten
					// día, así que cada uno sale un minuto antes que el anterior:
					// sin eso WordPress los ordenaría a su manera dentro del día.
					'post_date'    => gmdate( 'Y-m-d H:i:s', strtotime( ( $a['date'] ?? gmdate( 'Y-m-d' ) ) . ' 12:00:00 UTC' ) - $i * MINUTE_IN_SECONDS ),
					'meta_input'   => ca_import_meta( $a, $c, $lang, $slug ),
				),
				true
			);
			if ( is_wp_error( $post_id ) ) {
				continue;
			}
			if ( function_exists( 'pll_set_post_language' ) ) {
				pll_set_post_language( $post_id, $lang );
			}
			$ids[ $lang ] = $post_id;
			++$creadas;
		}
		if ( count( $ids ) > 1 && function_exists( 'pll_save_post_translations' ) ) {
			pll_save_post_translations( $ids );
			++$traducciones;
		}
	}
	ca_rest_bump_cache();

	return compact( 'creadas', 'saltadas', 'traducciones' );
}

/** Campos del artículo, en el formato de la caja del editor. */
function ca_import_meta( $a, $c, $lang, $slug ) {
	$pares = function ( $items, $izq, $der ) {
		return implode(
			"\n",
			array_map(
				function ( $i ) use ( $izq, $der ) {
					return $i[ $izq ] . ' | ' . $i[ $der ];
				},
				$items
			)
		);
	};

	$gallery = array();
	foreach ( (array) ( $a['gallery']['items'] ?? array() ) as $g ) {
		$caption   = $g['caption'][ $lang ] ?? ( $g['caption'][ CA_DEFAULT_LANG ] ?? '' );
		$gallery[] = absint( $g['tmdbId'] ) . ' | ' . $caption;
	}

	return array(
		'_ca_slug'         => $slug,
		'_ca_kicker'       => $c['kicker'] ?? '',
		'_ca_cover_tmdb'   => absint( $a['cover']['tmdbId'] ?? 0 ),
		'_ca_cover_kind'   => 'tv' === ( $a['cover']['kind'] ?? '' ) ? 'tv' : 'movie',
		'_ca_stats'        => $pares( (array) ( $c['stats'] ?? array() ), 'value', 'label' ),
		'_ca_gallery_kind' => 'tv' === ( $a['gallery']['kind'] ?? '' ) ? 'tv' : 'movie',
		'_ca_gallery'      => implode( "\n", $gallery ),
		'_ca_related'      => implode( ', ', array_map( 'absint', (array) ( $a['related'] ?? array() ) ) ),
		'_ca_sources'      => $pares( (array) ( $a['sources'] ?? array() ), 'label', 'url' ),
	);
}

/**
 * Cuerpo del artículo a bloques del editor. Mismas reglas que tenía la web:
 * «## » abre un subtítulo y **así** es negrita; todo lo demás se escapa.
 */
function ca_import_blocks( $body ) {
	$out = array();
	foreach ( (array) $body as $p ) {
		$p = (string) $p;
		if ( 0 === strpos( $p, '## ' ) ) {
			$out[] = "<!-- wp:heading -->\n<h2 class=\"wp-block-heading\">" . esc_html( trim( substr( $p, 3 ) ) ) . "</h2>\n<!-- /wp:heading -->";
			continue;
		}
		$html  = preg_replace( '/\*\*(.+?)\*\*/', '<strong>$1</strong>', esc_html( $p ) );
		$out[] = "<!-- wp:paragraph -->\n<p>" . $html . "</p>\n<!-- /wp:paragraph -->";
	}
	return implode( "\n\n", $out );
}
