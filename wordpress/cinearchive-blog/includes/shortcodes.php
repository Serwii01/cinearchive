<?php
/**
 * [pelicula id="1370191"]La bola negra[/pelicula]
 *
 * Enlaza una película del texto a su ficha en el archivo, en el idioma del
 * artículo. Sin texto dentro, pone el título que tiene en TMDB. Con
 * tipo="serie" no enlaza (las series no tienen ficha en el archivo): solo
 * pone el nombre en cursiva, para que el texto se lea igual.
 */

defined( 'ABSPATH' ) || exit;

add_shortcode(
	'pelicula',
	function ( $atts, $content = '' ) {
		$atts = shortcode_atts(
			array(
				'id'   => 0,
				'tipo' => 'pelicula',
			),
			$atts,
			'pelicula'
		);
		$id   = absint( $atts['id'] );
		$kind = in_array( $atts['tipo'], array( 'serie', 'tv' ), true ) ? 'tv' : 'movie';
		$lang = ca_post_lang( get_the_ID() );

		$texto = trim( (string) $content );
		if ( '' === $texto && $id ) {
			$item  = ca_tmdb_item( $id, $kind, $lang );
			$texto = $item ? $item['title'] : '';
		}
		if ( '' === $texto ) {
			return '';
		}
		if ( ! $id || 'tv' === $kind ) {
			return '<em class="ca-titulo">' . esc_html( $texto ) . '</em>';
		}
		return sprintf(
			'<a class="ca-pelicula" href="%s">%s</a>',
			esc_url( ca_film_link( $id, $lang ) ),
			esc_html( $texto )
		);
	}
);
