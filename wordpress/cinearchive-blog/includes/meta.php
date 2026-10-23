<?php
/**
 * Campos de cada artículo y su caja en el editor.
 *
 * Son los mismos que tenían los artículos de la web: antetítulo, portada
 * (una película o serie de TMDB), cifras clave, muro de carteles, películas
 * relacionadas y fuentes. La entradilla es el «Extracto» de WordPress.
 *
 * Las listas se escriben una por línea con « | » entre las partes. Es menos
 * vistoso que un formulario con botones, pero se escribe rápido, se copia de
 * un artículo a otro y no necesita ningún plugin más.
 */

defined( 'ABSPATH' ) || exit;

/** Campos: clave => tipo de dato que se guarda. */
function ca_meta_fields() {
	return array(
		'_ca_kicker'       => 'string',
		'_ca_cover_tmdb'   => 'integer',
		'_ca_cover_kind'   => 'string',
		'_ca_stats'        => 'string',
		'_ca_gallery_kind' => 'string',
		'_ca_gallery'      => 'string',
		'_ca_related'      => 'string',
		'_ca_sources'      => 'string',
		// Slug del artículo en la web antigua: con él se redirigen sus URLs.
		'_ca_slug'         => 'string',
	);
}

add_action(
	'init',
	function () {
		foreach ( ca_meta_fields() as $key => $type ) {
			register_post_meta(
				'post',
				$key,
				array(
					'type'          => $type,
					'single'        => true,
					'show_in_rest'  => true,
					'auth_callback' => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);
		}
	}
);

add_action(
	'add_meta_boxes_post',
	function () {
		add_meta_box( 'ca-articulo', 'Cine Archive — datos del artículo', 'ca_meta_box', 'post', 'normal', 'high' );
	}
);

function ca_meta_box( $post ) {
	wp_nonce_field( 'ca_meta', 'ca_meta_nonce' );
	$v = function ( $key ) use ( $post ) {
		return (string) get_post_meta( $post->ID, $key, true );
	};
	$kind = function ( $key ) use ( $v ) {
		return 'tv' === $v( $key ) ? 'tv' : 'movie';
	};
	?>
	<style>
		#ca-articulo .ca-campo { margin: 0 0 1.2em; }
		#ca-articulo label { display: block; font-weight: 600; margin-bottom: .3em; }
		#ca-articulo input[type=text], #ca-articulo input[type=number], #ca-articulo textarea { width: 100%; }
		#ca-articulo textarea { font-family: ui-monospace, monospace; min-height: 6em; }
		#ca-articulo .description { color: #646970; margin: .3em 0 0; }
		#ca-articulo .ca-fila { display: flex; gap: 1em; }
		#ca-articulo .ca-fila > * { flex: 1; }
	</style>
	<p class="description" style="margin-bottom:1.2em">La <strong>entradilla</strong> es el «Extracto» (panel lateral). Para enlazar una película a su ficha del archivo en el texto: <code>[pelicula id="1370191"]La bola negra[/pelicula]</code>. El número es el de TMDB (está en la dirección de su ficha).</p>

	<div class="ca-campo">
		<label for="ca_kicker">Antetítulo</label>
		<input type="text" id="ca_kicker" name="_ca_kicker" value="<?php echo esc_attr( $v( '_ca_kicker' ) ); ?>" placeholder="Festivales">
		<p class="description">La palabra sobre el título: «Festivales», «Premios», «Industria»…</p>
	</div>

	<div class="ca-fila ca-campo">
		<div>
			<label for="ca_cover_tmdb">Portada: id de TMDB</label>
			<input type="number" min="0" id="ca_cover_tmdb" name="_ca_cover_tmdb" value="<?php echo esc_attr( $v( '_ca_cover_tmdb' ) ); ?>">
			<p class="description">Se usa su imagen de fondo. Si pones una «Imagen destacada», manda la imagen destacada.</p>
		</div>
		<div>
			<label for="ca_cover_kind">Es una…</label>
			<select id="ca_cover_kind" name="_ca_cover_kind">
				<option value="movie" <?php selected( $kind( '_ca_cover_kind' ), 'movie' ); ?>>Película</option>
				<option value="tv" <?php selected( $kind( '_ca_cover_kind' ), 'tv' ); ?>>Serie</option>
			</select>
		</div>
	</div>

	<div class="ca-campo">
		<label for="ca_stats">Cifras clave</label>
		<textarea id="ca_stats" name="_ca_stats" placeholder="14 | Emmy para «The Studio»"><?php echo esc_textarea( $v( '_ca_stats' ) ); ?></textarea>
		<p class="description">Una por línea: <code>cifra | qué es</code>. Salen en fichas grandes bajo la entradilla.</p>
	</div>

	<div class="ca-campo">
		<label for="ca_related">Películas del artículo</label>
		<input type="text" id="ca_related" name="_ca_related" value="<?php echo esc_attr( $v( '_ca_related' ) ); ?>" placeholder="1370191, 1755291">
		<p class="description">Ids de TMDB separados por comas. Salen al pie con su cartel y enlazan a su ficha del archivo.</p>
	</div>

	<div class="ca-fila ca-campo">
		<div style="flex:3">
			<label for="ca_gallery">Galería de carteles</label>
			<textarea id="ca_gallery" name="_ca_gallery" placeholder="270476 | 14 Emmy · mejor comedia"><?php echo esc_textarea( $v( '_ca_gallery' ) ); ?></textarea>
			<p class="description">Una por línea: <code>id de TMDB | pie</code>. Para series o películas que no van en «Películas del artículo».</p>
		</div>
		<div>
			<label for="ca_gallery_kind">Son…</label>
			<select id="ca_gallery_kind" name="_ca_gallery_kind">
				<option value="movie" <?php selected( $kind( '_ca_gallery_kind' ), 'movie' ); ?>>Películas</option>
				<option value="tv" <?php selected( $kind( '_ca_gallery_kind' ), 'tv' ); ?>>Series</option>
			</select>
		</div>
	</div>

	<div class="ca-campo">
		<label for="ca_sources">Fuentes</label>
		<textarea id="ca_sources" name="_ca_sources" placeholder="Variety · Crítica de la película | https://variety.com/…"><?php echo esc_textarea( $v( '_ca_sources' ) ); ?></textarea>
		<p class="description">Una por línea: <code>texto | dirección</code>.</p>
	</div>
	<?php
}

add_action(
	'save_post_post',
	function ( $post_id ) {
		if ( ! isset( $_POST['ca_meta_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['ca_meta_nonce'] ), 'ca_meta' ) ) {
			return;
		}
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		$texto = function ( $key ) {
			return isset( $_POST[ $key ] ) ? sanitize_text_field( wp_unslash( $_POST[ $key ] ) ) : '';
		};
		$lineas = function ( $key ) {
			return isset( $_POST[ $key ] ) ? sanitize_textarea_field( wp_unslash( $_POST[ $key ] ) ) : '';
		};
		update_post_meta( $post_id, '_ca_kicker', $texto( '_ca_kicker' ) );
		update_post_meta( $post_id, '_ca_cover_tmdb', absint( $texto( '_ca_cover_tmdb' ) ) );
		update_post_meta( $post_id, '_ca_cover_kind', 'tv' === $texto( '_ca_cover_kind' ) ? 'tv' : 'movie' );
		update_post_meta( $post_id, '_ca_stats', $lineas( '_ca_stats' ) );
		update_post_meta( $post_id, '_ca_gallery_kind', 'tv' === $texto( '_ca_gallery_kind' ) ? 'tv' : 'movie' );
		update_post_meta( $post_id, '_ca_gallery', $lineas( '_ca_gallery' ) );
		update_post_meta( $post_id, '_ca_related', implode( ', ', ca_parse_ids( $texto( '_ca_related' ) ) ) );
		update_post_meta( $post_id, '_ca_sources', $lineas( '_ca_sources' ) );
	}
);

/**
 * Parte un texto de «a | b» por líneas. Las líneas vacías o sin separador se
 * saltan (si falta la segunda parte, queda vacía).
 *
 * @return array<int, array{0:string,1:string}>
 */
function ca_parse_pairs( $text ) {
	$out = array();
	foreach ( preg_split( '/\R/', (string) $text ) as $linea ) {
		$linea = trim( $linea );
		if ( '' === $linea ) {
			continue;
		}
		$partes = array_map( 'trim', explode( '|', $linea, 2 ) );
		$out[]  = array( $partes[0], $partes[1] ?? '' );
	}
	return $out;
}

/** Ids de TMDB de un texto («1, 2 3»), sin repetir y en orden. */
function ca_parse_ids( $text ) {
	preg_match_all( '/\d+/', (string) $text, $m );
	return array_values( array_unique( array_filter( array_map( 'absint', $m[0] ) ) ) );
}
