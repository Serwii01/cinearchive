<?php
/**
 * Idiomas. Los mismos cinco que la web y con los mismos códigos, porque las
 * URLs de las fichas se construyen con ellos (/en/film/…, y sin prefijo en
 * castellano).
 *
 * Con Polylang activo se le pregunta a él; sin Polylang, todo es castellano.
 */

defined( 'ABSPATH' ) || exit;

const CA_LANGS        = array( 'es', 'en', 'gl', 'eu', 'ca' );
const CA_DEFAULT_LANG = 'es';

/** ¿Es un código de idioma de la casa? */
function ca_is_lang( $lang ) {
	return is_string( $lang ) && in_array( $lang, CA_LANGS, true );
}

/** Idioma de la página que se está pintando. */
function ca_current_lang() {
	if ( function_exists( 'pll_current_language' ) ) {
		$lang = pll_current_language( 'slug' );
		if ( ca_is_lang( $lang ) ) {
			return $lang;
		}
	}
	return CA_DEFAULT_LANG;
}

/** Idioma de una entrada concreta. */
function ca_post_lang( $post_id ) {
	if ( function_exists( 'pll_get_post_language' ) ) {
		$lang = pll_get_post_language( $post_id, 'slug' );
		if ( ca_is_lang( $lang ) ) {
			return $lang;
		}
	}
	return CA_DEFAULT_LANG;
}

/** Idiomas dados de alta en Polylang (o solo el castellano si no está). */
function ca_active_langs() {
	if ( function_exists( 'pll_languages_list' ) ) {
		$list = array_values( array_filter( (array) pll_languages_list( array( 'fields' => 'slug' ) ), 'ca_is_lang' ) );
		if ( $list ) {
			return $list;
		}
	}
	return array( CA_DEFAULT_LANG );
}

/** Código que entiende TMDB para cada idioma. */
function ca_tmdb_locale( $lang ) {
	$map = array(
		'es' => 'es-ES',
		'en' => 'en-US',
		'gl' => 'gl-ES',
		'eu' => 'eu-ES',
		'ca' => 'ca-ES',
	);
	return $map[ $lang ] ?? 'es-ES';
}
