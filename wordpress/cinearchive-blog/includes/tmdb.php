<?php
/**
 * TMDB: títulos, carteles y fondos de las películas y series de los artículos.
 *
 * Cada respuesta se guarda una semana (transients): un artículo se lee muchas
 * más veces de las que cambia una ficha de TMDB. Un fallo se guarda una hora,
 * para no martillear la API si la clave está mal o TMDB no responde. Sin clave
 * no se pide nada y el artículo sale sin imágenes, pero sale.
 */

defined( 'ABSPATH' ) || exit;

const CA_TMDB_IMG = 'https://image.tmdb.org/t/p';

/**
 * Petición a la API v3. Devuelve el JSON decodificado o null.
 *
 * @param string $path   Por ejemplo «movie/603».
 * @param array  $params Parámetros extra de la consulta.
 */
function ca_tmdb_get( $path, $params = array() ) {
	$key = ca_tmdb_key();
	if ( '' === $key ) {
		return null;
	}
	$params    = array_merge( $params, array( 'api_key' => $key ) );
	$cache_key = 'ca_tmdb_' . md5( $path . '|' . wp_json_encode( $params ) );
	$guardado  = get_transient( $cache_key );
	if ( is_array( $guardado ) ) {
		return empty( $guardado['__error'] ) ? $guardado : null;
	}

	$res = wp_remote_get(
		add_query_arg( $params, 'https://api.themoviedb.org/3/' . ltrim( $path, '/' ) ),
		array( 'timeout' => 6 )
	);
	if ( is_wp_error( $res ) || 200 !== wp_remote_retrieve_response_code( $res ) ) {
		set_transient( $cache_key, array( '__error' => 1 ), HOUR_IN_SECONDS );
		return null;
	}
	$data = json_decode( wp_remote_retrieve_body( $res ), true );
	if ( ! is_array( $data ) ) {
		set_transient( $cache_key, array( '__error' => 1 ), HOUR_IN_SECONDS );
		return null;
	}
	set_transient( $cache_key, $data, WEEK_IN_SECONDS );
	return $data;
}

/**
 * Lo que necesita un artículo de una película o serie.
 *
 * @param int    $id   Id de TMDB.
 * @param string $kind 'movie' o 'tv'.
 * @param string $lang Idioma de la casa.
 * @return array|null title, year, director, poster_path, backdrop_path.
 */
function ca_tmdb_item( $id, $kind = 'movie', $lang = CA_DEFAULT_LANG ) {
	$id   = absint( $id );
	$kind = 'tv' === $kind ? 'tv' : 'movie';
	if ( ! $id ) {
		return null;
	}
	$args = array( 'language' => ca_tmdb_locale( $lang ) );
	if ( 'movie' === $kind ) {
		$args['append_to_response'] = 'credits';
	}
	$d = ca_tmdb_get( "$kind/$id", $args );
	if ( ! $d ) {
		return null;
	}

	$title = 'tv' === $kind ? ( $d['name'] ?? '' ) : ( $d['title'] ?? '' );
	$fecha = 'tv' === $kind ? ( $d['first_air_date'] ?? '' ) : ( $d['release_date'] ?? '' );

	$director = '';
	foreach ( (array) ( $d['credits']['crew'] ?? array() ) as $c ) {
		if ( 'Director' === ( $c['job'] ?? '' ) ) {
			$director = $c['name'];
			break;
		}
	}

	return array(
		'id'            => $id,
		'kind'          => $kind,
		'title'         => $title,
		'year'          => $fecha ? (int) substr( $fecha, 0, 4 ) : null,
		'director'      => $director,
		'poster_path'   => $d['poster_path'] ?? null,
		'backdrop_path' => $d['backdrop_path'] ?? null,
	);
}

/** URL de una imagen de TMDB, o null si no hay ruta. */
function ca_tmdb_img( $path, $size = 'w342' ) {
	return $path ? CA_TMDB_IMG . '/' . $size . $path : null;
}
