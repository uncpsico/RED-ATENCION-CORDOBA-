-- Datos iniciales: las categorías, lugares y líneas de urgencia del prototipo.

insert into public.categorias (id, nombre, emoji, color, orden) values
  ('judicial',    'Judicial/Legal',     '⚖️', '#a66d4f', 1),
  ('salud',       'Salud',              '🏥', '#798f75', 2),
  ('ninez',       'Niñez/Adolescencia', '👧', '#c4868e', 3),
  ('soccivil',    'ONG/Soc. Civil',     '🤝', '#c29d71', 4),
  ('psicosocial', 'Psicosocial',        '💬', '#8da5a3', 5),
  ('otro',        'Otro',               '📍', '#9e9791', 999);

insert into public.instituciones (nombre, categoria_id, direccion, telefono, horario, contacto, servicios, lat, lng) values
  ('Polo Integral de la Mujer', 'psicosocial', 'Entre Ríos 680 esq. Bv. Perón, Córdoba', '0800 888 9898 / 351 8141400', 'Atención 24 hs', 'WhatsApp', 'Atención integral en violencia de género. Área DIS, Brigada de Protección, asesoramiento legal, psicológico.', -31.42102, -64.17563),
  ('U.J. Delitos contra la Integridad Sexual', 'judicial', 'Entre Ríos 680, Córdoba', 'Interno 34422', 'Atención 24 hs', 'MPF Córdoba', 'Unidad Judicial especializada en delitos sexuales.', -31.42102, -64.17563),
  ('U.J. Violencia Familiar', 'judicial', 'Entre Ríos 680, Córdoba', 'Interno 30641', 'Atención 24 hs', 'MPF Córdoba', 'Toma de denuncias de violencia familiar y medidas cautelares.', -31.42102, -64.17563),
  ('SeNAF — Sede Central', 'ninez', 'Av. Vélez Sarsfield 771, Córdoba', '(0351) 4343456', 'Lunes a viernes, 8 a 20 hs', 'Secretaría de Niñez', 'Interviene en abuso y vulneración de derechos de NNyA.', -31.42432, -64.19054),
  ('Hospital Pediátrico del Niño Jesús', 'salud', 'Av. Castro Barros 650, Córdoba', '(0351) 4346060', 'Guardia 24 hs', 'Ministerio de Salud', 'Hospital de referencia para NNyA (Barrio San Martín).', -31.39925, -64.19776),
  ('Fiscalía General — MPF', 'judicial', 'Caseros 551, Córdoba', '(0351) 4481000', 'Lunes a viernes, 8 a 14 hs', 'mpfcordoba.gob.ar', 'Fiscalías especializadas en violencia.', -31.4161, -64.1923),
  ('Defensoría del Pueblo', 'psicosocial', 'Deán Funes 352, Córdoba', '', 'Lunes a viernes, 8 a 18 hs', 'defensorcordoba.org.ar', 'Orientación y asistencia en casos de violencia.', -31.41459, -64.1888),
  ('Defensoría de los Derechos de NNyA', 'ninez', 'Dámaso Larrañaga 94, Nueva Córdoba', '(351) 428 8888', 'Lunes a viernes', 'consulta.defensoria@cba.gov.ar', 'Acompaña a personas e instituciones en restitución de derechos.', -31.42708, -64.18724);

insert into public.urgencias (nombre, numero, descripcion, categoria_id, es_fija, estilo, color, orden) values
  ('Emergencias',          '911',           'Policía, peligro inmediato',      'otro',        true, 'principal', '#b06a6c', 1),
  ('Violencia de género',  '144',           'Contención y orientación, 24 hs', 'psicosocial', true, 'tarjeta',   '#8e4a55', 2),
  ('Víctimas de delitos',  '149',           'Asistencia nacional, 24 hs',      'judicial',    true, 'tarjeta',   '#a66d4f', 3),
  ('Polo de la Mujer',     '0800 888 9898', 'Córdoba, 24 hs',                  'psicosocial', true, 'tarjeta',   '#5f7a77', 4),
  ('Niñez y adolescencia', '102',           'Derechos de chicos y chicas',     'ninez',       true, 'tarjeta',   '#a8707a', 5),
  ('Emergencia médica',    '107',           '',                                'salud',       true, 'mini',      '#687e64', 6),
  ('Bomberos',             '100',           '',                                'otro',        true, 'mini',      '#a66d4f', 7),
  ('Trata de personas',    '145',           '',                                'judicial',    true, 'mini',      '#a66d4f', 8);
