<?php
/**
 * Ajustes → Cine Archive: la dirección del archivo y la clave de TMDB.
 *
 * La clave también puede ir en wp-config.php como CINEARCHIVE_TMDB_KEY, que
 * es mejor sitio para una clave que la base de datos; si está ahí, manda.
 */

defined( 'ABSPATH' ) || exit;

/** Dirección del archivo, sin barra final. */
function ca_archive_url() {
	$url = get_option( 'ca_archive_url', 'https://cinearchive.es' );
	return untrailingslashit( $url ? $url : 'https://cinearchive.es' );
}

/** Clave v3 de TMDB, o cadena vacía. */
function ca_tmdb_key() {
	if ( defined( 'CINEARCHIVE_TMDB_KEY' ) && CINEARCHIVE_TMDB_KEY ) {
		return (string) CINEARCHIVE_TMDB_KEY;
	}
	return (string) get_option( 'ca_tmdb_key', '' );
}

/**
 * Enlace a una página del archivo en el idioma dado. El castellano no lleva
 * prefijo, igual que en la web (localizePath en src/i18n/ui.ts).
 */
function ca_archive_link( $path = '', $lang = CA_DEFAULT_LANG ) {
	$path   = trim( (string) $path, '/' );
	$prefix = ( CA_DEFAULT_LANG === $lang || ! ca_is_lang( $lang ) ) ? '' : '/' . $lang;
	return ca_archive_url() . $prefix . ( '' === $path ? '/' : '/' . $path );
}

/** Ficha de una película en el archivo. */
function ca_film_link( $tmdb_id, $lang = CA_DEFAULT_LANG ) {
	return ca_archive_link( 'film/' . absint( $tmdb_id ), $lang );
}

add_action(
	'admin_init',
	function () {
		register_setting(
			'ca_settings',
			'ca_archive_url',
			array(
				'type'              => 'string',
				'sanitize_callback' => 'esc_url_raw',
				'default'           => 'https://cinearchive.es',
			)
		);
		register_setting(
			'ca_settings',
			'ca_tmdb_key',
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => '',
			)
		);
	}
);

add_action(
	'admin_menu',
	function () {
		add_options_page( 'Cine Archive', 'Cine Archive', 'manage_options', 'cinearchive', 'ca_settings_page' );
	}
);

function ca_settings_page() {
	$en_config = defined( 'CINEARCHIVE_TMDB_KEY' ) && CINEARCHIVE_TMDB_KEY;
	?>
	<div class="wrap">
		<h1>Cine Archive</h1>
		<form method="post" action="options.php">
			<?php settings_fields( 'ca_settings' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="ca_archive_url">Dirección del archivo</label></th>
					<td>
						<input name="ca_archive_url" id="ca_archive_url" type="url" class="regular-text" value="<?php echo esc_attr( ca_archive_url() ); ?>">
						<p class="description">Las películas de los artículos enlazan a sus fichas aquí.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="ca_tmdb_key">Clave de TMDB (v3)</label></th>
					<td>
						<?php if ( $en_config ) : ?>
							<p>Definida en <code>wp-config.php</code> (<code>CINEARCHIVE_TMDB_KEY</code>).</p>
						<?php else : ?>
							<input name="ca_tmdb_key" id="ca_tmdb_key" type="password" class="regular-text" value="<?php echo esc_attr( get_option( 'ca_tmdb_key', '' ) ); ?>" autocomplete="off">
							<p class="description">La misma que <code>TMDB_API_KEY</code> en el <code>.env</code> de la web. Sirve para las portadas, los carteles y los títulos de las películas.</p>
						<?php endif; ?>
					</td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}
