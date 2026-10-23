<?php
/**
 * Tema del blog de Cine Archive.
 *
 * Solo pinta. Los datos de los artículos (antetítulo, cifras, películas…) y
 * los enlaces al archivo los da el plugin «Cine Archive — Blog»; si el plugin
 * no está activo, el tema sigue funcionando con lo que trae WordPress de
 * serie (título, extracto, imagen destacada y texto).
 */

defined( 'ABSPATH' ) || exit;

define( 'CAT_VERSION', '1.0.0' );

add_action(
	'after_setup_theme',
	function () {
		add_theme_support( 'title-tag' );
		add_theme_support( 'post-thumbnails' );
		add_theme_support( 'automatic-feed-links' );
		add_theme_support( 'responsive-embeds' );
		add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script' ) );
		add_theme_support( 'editor-styles' );
		add_editor_style( 'assets/editor.css' );
	}
);

add_action(
	'wp_enqueue_scripts',
	function () {
		wp_enqueue_style( 'cinearchive', get_stylesheet_uri(), array(), CAT_VERSION );
		wp_enqueue_script( 'cinearchive', get_template_directory_uri() . '/assets/theme.js', array(), CAT_VERSION, array( 'strategy' => 'defer' ) );
	}
);

// Precarga las dos fuentes que se ven nada más entrar: sin esto el titular
// sale un instante con la letra del sistema.
add_action(
	'wp_head',
	function () {
		$base = get_template_directory_uri() . '/assets/fonts/';
		foreach ( array( 'eb-garamond.woff2', 'geist-400.woff2' ) as $f ) {
			printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( $base . $f ) );
		}
	},
	1
);

/* ---- Puentes con el plugin (y lo que pasa si no está) ---- */

/** Idioma de la página. */
function cat_lang() {
	return function_exists( 'ca_current_lang' ) ? ca_current_lang() : 'es';
}

/** Enlace a una sección del archivo. */
function cat_archive( $path = '', $lang = null ) {
	$lang = $lang ? $lang : cat_lang();
	if ( function_exists( 'ca_archive_link' ) ) {
		return ca_archive_link( $path, $lang );
	}
	$prefix = 'es' === $lang ? '' : '/' . $lang;
	return 'https://cinearchive.es' . $prefix . '/' . trim( $path, '/' );
}

/** Texto de la interfaz en el idioma de la página (inc/strings.php). */
function cat_t( $key ) {
	static $strings = null;
	if ( null === $strings ) {
		$strings = require __DIR__ . '/inc/strings.php';
	}
	$lang = cat_lang();
	return $strings[ $lang ][ $key ] ?? ( $strings['es'][ $key ] ?? $key );
}

/** Fecha en el idioma de la página: «15 de septiembre de 2026». */
function cat_date( $post = null ) {
	$dia     = get_the_date( 'Y-m-d', $post );
	$locales = array(
		'es' => 'es_ES',
		'en' => 'en_US',
		'gl' => 'gl_ES',
		'eu' => 'eu_ES',
		'ca' => 'ca_ES',
	);
	// Se formatea el día del calendario a mediodía en UTC, no el instante en la
	// zona del sitio: ICU no entiende las zonas como «+00:00» (las que pone
	// WordPress cuando se elige «UTC+0» en Ajustes) y lanzaba una excepción
	// que tumbaba la página.
	if ( $dia && class_exists( 'IntlDateFormatter' ) ) {
		try {
			$fmt = new IntlDateFormatter( $locales[ cat_lang() ] ?? 'es_ES', IntlDateFormatter::LONG, IntlDateFormatter::NONE, 'UTC' );
			$out = $fmt->format( strtotime( $dia . ' 12:00:00 UTC' ) );
			if ( $out ) {
				return $out;
			}
		} catch ( Exception $e ) {
			// Sin intl útil: la fecha que da WordPress, en su idioma.
		}
	}
	return get_the_date( '', $post );
}

/** Datos del artículo (ver el plugin), con lo mínimo si el plugin no está. */
function cat_article( $post_id ) {
	if ( function_exists( 'ca_article' ) ) {
		return ca_article( $post_id );
	}
	return array(
		'lang'    => 'es',
		'kicker'  => '',
		'lead'    => get_the_excerpt( $post_id ),
		'cover'   => get_the_post_thumbnail_url( $post_id, 'full' ),
		'stats'   => array(),
		'gallery' => array(),
		'related' => array(),
		'sources' => array(),
	);
}

/** Imagen para las tarjetas del listado. */
function cat_card_image( $post_id ) {
	if ( function_exists( 'ca_post_image' ) ) {
		return ca_post_image( $post_id, 'large' );
	}
	return get_the_post_thumbnail_url( $post_id, 'large' );
}

/** Antetítulo para las tarjetas. */
function cat_kicker( $post_id ) {
	if ( function_exists( 'ca_post_kicker' ) ) {
		return ca_post_kicker( $post_id );
	}
	$cats = get_the_category( $post_id );
	return $cats ? $cats[0]->name : '';
}

/** Entradilla para las tarjetas. */
function cat_lead( $post_id ) {
	return function_exists( 'ca_post_lead' ) ? ca_post_lead( $post_id ) : get_the_excerpt( $post_id );
}

/**
 * Selector de idioma (Polylang). Devuelve una lista de
 * array( slug, url, current, missing ) o vacía si no hay Polylang.
 */
function cat_languages() {
	if ( ! function_exists( 'pll_the_languages' ) ) {
		return array();
	}
	$raw = pll_the_languages(
		array(
			'raw'           => 1,
			'hide_if_empty' => 0,
			'hide_if_no_translation' => 0,
		)
	);
	$out = array();
	foreach ( (array) $raw as $l ) {
		$out[] = array(
			'slug'    => $l['slug'],
			'url'     => $l['url'],
			'current' => ! empty( $l['current_lang'] ),
			'missing' => ! empty( $l['no_translation'] ),
		);
	}
	return $out;
}

/** Pinta el selector de idioma. */
function cat_language_links() {
	$langs = cat_languages();
	if ( ! $langs ) {
		return;
	}
	echo '<div class="langs" aria-label="' . esc_attr( cat_t( 'lang.switch' ) ) . '">';
	foreach ( $langs as $l ) {
		printf(
			'<a href="%s" hreflang="%s" lang="%s"%s%s>%s</a>',
			esc_url( $l['url'] ),
			esc_attr( $l['slug'] ),
			esc_attr( $l['slug'] ),
			$l['current'] ? ' aria-current="true"' : '',
			$l['missing'] ? ' class="no-translation"' : '',
			esc_html( strtoupper( $l['slug'] ) )
		);
	}
	echo '</div>';
}

/** Portada del blog en el idioma actual. */
function cat_blog_home() {
	return function_exists( 'pll_home_url' ) ? pll_home_url() : home_url( '/' );
}

// Extractos sin «[…]» al final: las tarjetas ya dicen «Leer el artículo».
add_filter(
	'excerpt_more',
	function () {
		return '…';
	}
);

// Las búsquedas y los listados, solo de entradas.
add_action(
	'pre_get_posts',
	function ( $q ) {
		if ( ! is_admin() && $q->is_main_query() && $q->is_search() ) {
			$q->set( 'post_type', 'post' );
		}
	}
);
