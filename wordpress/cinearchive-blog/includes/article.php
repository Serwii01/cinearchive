<?php
/**
 * Todo lo que el tema necesita para pintar un artículo, ya resuelto: las
 * películas con su título y cartel de TMDB, los enlaces a las fichas del
 * archivo y las listas partidas. El tema solo pinta.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Imagen de cabecera: la «Imagen destacada» si la hay; si no, el fondo de la
 * película o serie de portada.
 *
 * @param string $size 'large' para tarjetas, 'full' para la cabecera.
 */
function ca_post_image( $post_id, $size = 'large' ) {
	if ( has_post_thumbnail( $post_id ) ) {
		$url = get_the_post_thumbnail_url( $post_id, $size );
		if ( $url ) {
			return $url;
		}
	}
	$tmdb = absint( get_post_meta( $post_id, '_ca_cover_tmdb', true ) );
	if ( ! $tmdb ) {
		return null;
	}
	$item = ca_tmdb_item( $tmdb, get_post_meta( $post_id, '_ca_cover_kind', true ), ca_post_lang( $post_id ) );
	return $item ? ca_tmdb_img( $item['backdrop_path'], 'full' === $size ? 'w1280' : 'w780' ) : null;
}

/** Antetítulo, o la primera categoría si no hay. */
function ca_post_kicker( $post_id ) {
	$kicker = trim( (string) get_post_meta( $post_id, '_ca_kicker', true ) );
	if ( '' !== $kicker ) {
		return $kicker;
	}
	$cats = get_the_category( $post_id );
	return $cats ? $cats[0]->name : '';
}

/** Entradilla: el extracto escrito a mano, o el que saca WordPress del texto. */
function ca_post_lead( $post_id ) {
	$post = get_post( $post_id );
	if ( ! $post ) {
		return '';
	}
	return '' !== trim( $post->post_excerpt ) ? $post->post_excerpt : wp_trim_words( wp_strip_all_tags( strip_shortcodes( $post->post_content ) ), 40 );
}

/**
 * Datos del artículo para la plantilla.
 *
 * @return array{lang:string,kicker:string,lead:string,cover:?string,stats:array,gallery:array,related:array,sources:array}
 */
function ca_article( $post_id ) {
	$lang = ca_post_lang( $post_id );

	$stats = array();
	foreach ( ca_parse_pairs( get_post_meta( $post_id, '_ca_stats', true ) ) as $p ) {
		$stats[] = array(
			'value' => $p[0],
			'label' => $p[1],
		);
	}

	$gallery      = array();
	$gallery_kind = get_post_meta( $post_id, '_ca_gallery_kind', true );
	foreach ( ca_parse_pairs( get_post_meta( $post_id, '_ca_gallery', true ) ) as $p ) {
		$item = ca_tmdb_item( absint( $p[0] ), $gallery_kind, $lang );
		if ( ! $item ) {
			continue; // sin ficha, sin cartel: el muro sigue con los demás
		}
		$gallery[] = array(
			'title'   => $item['title'],
			'poster'  => ca_tmdb_img( $item['poster_path'], 'w342' ),
			'srcset'  => $item['poster_path'] ? ca_tmdb_img( $item['poster_path'], 'w342' ) . ' 342w, ' . ca_tmdb_img( $item['poster_path'], 'w500' ) . ' 500w' : null,
			'caption' => $p[1],
			// Las series no tienen ficha en el archivo; las películas, sí.
			'url'     => 'movie' === $item['kind'] ? ca_film_link( $item['id'], $lang ) : null,
		);
	}

	$related = array();
	foreach ( ca_parse_ids( get_post_meta( $post_id, '_ca_related', true ) ) as $id ) {
		$item      = ca_tmdb_item( $id, 'movie', $lang );
		$related[] = array(
			'title'  => $item ? $item['title'] : '#' . $id,
			'poster' => $item ? ca_tmdb_img( $item['poster_path'], 'w342' ) : null,
			'srcset' => ( $item && $item['poster_path'] ) ? ca_tmdb_img( $item['poster_path'], 'w342' ) . ' 342w, ' . ca_tmdb_img( $item['poster_path'], 'w500' ) . ' 500w' : null,
			'meta'   => $item ? implode( ' · ', array_filter( array( $item['director'], $item['year'] ) ) ) : '',
			'url'    => ca_film_link( $id, $lang ),
		);
	}

	$sources = array();
	foreach ( ca_parse_pairs( get_post_meta( $post_id, '_ca_sources', true ) ) as $p ) {
		$url = esc_url_raw( $p[1] );
		if ( $url ) {
			$sources[] = array(
				'label' => $p[0],
				'url'   => $url,
			);
		}
	}

	return array(
		'lang'    => $lang,
		'kicker'  => ca_post_kicker( $post_id ),
		'lead'    => ca_post_lead( $post_id ),
		'cover'   => ca_post_image( $post_id, 'full' ),
		'stats'   => $stats,
		'gallery' => $gallery,
		'related' => $related,
		'sources' => $sources,
	);
}
