<?php
/**
 * GET /wp-json/cinearchive/v1/posts?lang=es&per_page=12
 *
 * Lo que lee cinearchive.es para su sección de artículos y su portada: solo
 * los campos que pinta, ya resueltos (antetítulo, entradilla, imagen). Así la
 * web no depende de cómo guarda WordPress las cosas por dentro, ni de si
 * Polylang filtra o no por idioma en la API estándar.
 *
 * La respuesta se guarda diez minutos y se tira cada vez que se publica, edita
 * o borra una entrada: lo nuevo aparece en la web en cuanto la web vuelve a
 * preguntar.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'cinearchive/v1',
			'/posts',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'callback'            => 'ca_rest_posts',
				'args'                => array(
					'lang'     => array(
						'type'    => 'string',
						'default' => CA_DEFAULT_LANG,
					),
					'per_page' => array(
						'type'    => 'integer',
						'default' => 12,
						'minimum' => 1,
						'maximum' => 50,
					),
					'page'     => array(
						'type'    => 'integer',
						'default' => 1,
						'minimum' => 1,
					),
				),
			)
		);
	}
);

/** Versión de la caché: cambia con cada publicación. */
function ca_rest_cache_version() {
	return (int) get_option( 'ca_rest_cache_version', 1 );
}

function ca_rest_bump_cache() {
	update_option( 'ca_rest_cache_version', ca_rest_cache_version() + 1, false );
}
add_action( 'save_post_post', 'ca_rest_bump_cache' );
add_action( 'deleted_post', 'ca_rest_bump_cache' );
add_action( 'transition_post_status', 'ca_rest_bump_cache' );

function ca_rest_posts( WP_REST_Request $req ) {
	$lang     = ca_is_lang( $req['lang'] ) ? $req['lang'] : CA_DEFAULT_LANG;
	$per_page = (int) $req['per_page'];
	$page     = (int) $req['page'];

	$cache_key = sprintf( 'ca_rest_%d_%s_%d_%d', ca_rest_cache_version(), $lang, $per_page, $page );
	$guardado  = get_transient( $cache_key );
	if ( is_array( $guardado ) ) {
		return rest_ensure_response( $guardado );
	}

	$args = array(
		'post_type'           => 'post',
		'post_status'         => 'publish',
		'posts_per_page'      => $per_page,
		'paged'               => $page,
		'ignore_sticky_posts' => true,
		'no_found_rows'       => false,
	);
	// Con Polylang, WP_Query entiende «lang». Sin Polylang todo es castellano
	// y pedir otro idioma devuelve la lista vacía, no la castellana: la web
	// decide qué hacer si un idioma no tiene artículos.
	if ( function_exists( 'pll_languages_list' ) ) {
		$args['lang'] = $lang;
	} elseif ( CA_DEFAULT_LANG !== $lang ) {
		$args['post__in'] = array( 0 );
	}
	$q = new WP_Query( $args );

	$posts = array();
	foreach ( $q->posts as $p ) {
		$posts[] = array(
			'id'       => $p->ID,
			'slug'     => $p->post_name,
			'articulo' => (string) get_post_meta( $p->ID, '_ca_slug', true ),
			'url'      => get_permalink( $p ),
			'title'    => html_entity_decode( get_the_title( $p ), ENT_QUOTES, 'UTF-8' ),
			'kicker'   => ca_post_kicker( $p->ID ),
			'excerpt'  => html_entity_decode( ca_post_lead( $p->ID ), ENT_QUOTES, 'UTF-8' ),
			'date'     => get_the_date( 'Y-m-d', $p ),
			'image'    => ca_post_image( $p->ID, 'large' ),
		);
	}

	$data = array(
		'lang'  => $lang,
		'total' => (int) $q->found_posts,
		'posts' => $posts,
	);
	set_transient( $cache_key, $data, 10 * MINUTE_IN_SECONDS );
	return rest_ensure_response( $data );
}
