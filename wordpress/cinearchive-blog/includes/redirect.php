<?php
/**
 * blog.cinearchive.es/?ca_articulo=emmy-2026&lang=en
 *
 * Las URLs antiguas de los artículos (cinearchive.es/en/articles/emmy-2026)
 * redirigen aquí, y aquí se busca la entrada importada de ese artículo en ese
 * idioma. Así la web no tiene que saber las URLs de WordPress, y si cambian
 * (otro formato de enlaces permanentes, otro slug) las antiguas siguen
 * llegando a su sitio.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'template_redirect',
	function () {
		if ( empty( $_GET['ca_articulo'] ) ) {
			return;
		}
		$slug = sanitize_title( wp_unslash( $_GET['ca_articulo'] ) );
		$lang = isset( $_GET['lang'] ) ? sanitize_key( wp_unslash( $_GET['lang'] ) ) : CA_DEFAULT_LANG;
		if ( ! ca_is_lang( $lang ) ) {
			$lang = CA_DEFAULT_LANG;
		}

		$post_id = ca_find_imported( $slug, $lang );
		if ( ! $post_id && CA_DEFAULT_LANG !== $lang ) {
			$post_id = ca_find_imported( $slug, CA_DEFAULT_LANG );
		}
		if ( $post_id ) {
			wp_safe_redirect( get_permalink( $post_id ), 301 );
			exit;
		}
		// Un artículo que ya no existe: a la portada del blog en su idioma.
		$home = function_exists( 'pll_home_url' ) ? pll_home_url( $lang ) : home_url( '/' );
		wp_safe_redirect( $home, 302 );
		exit;
	}
);

/** Entrada publicada que se importó con ese slug y está en ese idioma. */
function ca_find_imported( $slug, $lang, $status = 'publish' ) {
	$args = array(
		'post_type'      => 'post',
		'post_status'    => $status,
		'posts_per_page' => 1,
		'fields'         => 'ids',
		'meta_key'       => '_ca_slug',
		'meta_value'     => $slug,
		'no_found_rows'  => true,
	);
	if ( function_exists( 'pll_languages_list' ) ) {
		$args['lang'] = $lang;
	} elseif ( CA_DEFAULT_LANG !== $lang ) {
		return 0;
	}
	$ids = get_posts( $args );
	return $ids ? (int) $ids[0] : 0;
}
