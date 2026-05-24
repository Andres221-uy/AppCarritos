// ════════════════════════════════════════════════════════════
//  CONFIG — reemplazá con tus keys de Supabase
// ════════════════════════════════════════════════════════════
var SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
var SUPABASE_ANON_KEY = 'TU_ANON_KEY';

var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ════════════════════════════════════════════════════════════
//  DATOS DE EJEMPLO (mientras no haya DB)
//  TODO: reemplazar con llamadas a Supabase
//  Ej: sb.from('carritos').select('*').then(...)
// ════════════════════════════════════════════════════════════
var CARRITOS = [
  { id:1, nombre:"El Chivito de Pancho", tipo:"Chivitos y milanesas", emoji:"🥩",
    barrio:"Pocitos, Montevideo", lat:-34.912, lng:-56.152,
    rating:4.8, reviews:142, estado:"abierto",
    horario:"Lun–Sáb 11:00–23:00 · Dom 14:00–22:00",
    telefono:"+598 99 123 456", especialidad:"Chivito al pan", cats:["Chivitos"],
    menu:[
      {nombre:"Chivito al pan",desc:"Lomo fino, jamón, queso, huevo, aceitunas, tomate, lechuga y mayonesa.",precio:"$310"},
      {nombre:"Chivito canadiense",desc:"El clásico con panceta ahumada y morrón.",precio:"$340"},
      {nombre:"Milanesa completa",desc:"Milanesa de res, lechuga, tomate, huevo y papas fritas.",precio:"$290"}
    ],
    resenas:[
      {user:"María V.",stars:5,fecha:"Hace 2 días",texto:"El mejor chivito de Pocitos sin dudas."},
      {user:"Rodrigo M.",stars:5,fecha:"Hace 1 semana",texto:"Vengo todos los viernes. Atención rápida."},
      {user:"Lucía P.",stars:4,fecha:"Hace 2 semanas",texto:"Muy rico, a veces la espera es larga."}
    ]},
  { id:2, nombre:"Tortas Fritas Doña Carmen", tipo:"Tortas fritas y dulces", emoji:"🥞",
    barrio:"Ciudad Vieja, Montevideo", lat:-34.907, lng:-56.201,
    rating:4.6, reviews:89, estado:"abierto",
    horario:"Mar–Dom 07:00–13:00",
    telefono:"+598 98 765 432", especialidad:"Tortas fritas con dulce de leche", cats:["Tortas"],
    menu:[
      {nombre:"Torta frita clásica",desc:"Masa frita con dulce de leche artesanal.",precio:"$60"},
      {nombre:"Torta frita salada",desc:"Con queso y jamón.",precio:"$75"},
      {nombre:"Combo mate + 3 tortas",desc:"Tres tortas a elección más yerbas para el mate.",precio:"$160"}
    ],
    resenas:[
      {user:"Pablo F.",stars:5,fecha:"Ayer",texto:"Doña Carmen es una institución."},
      {user:"Ana S.",stars:4,fecha:"Hace 3 días",texto:"Riquísimas. ¡Habría que ir más seguido!"}
    ]},
  { id:3, nombre:"La Pizza del Gato", tipo:"Pizzas y fugazzeta", emoji:"🍕",
    barrio:"Colón, Montevideo", lat:-34.866, lng:-56.213,
    rating:4.5, reviews:67, estado:"abierto",
    horario:"Jue–Dom 18:00–01:00",
    telefono:"+598 91 234 567", especialidad:"Fugazzeta rellena", cats:["Pizzas"],
    menu:[
      {nombre:"Fugazzeta rellena",desc:"Doble masa, mozzarella abundante y cebolla caramelizada.",precio:"$280/porción"},
      {nombre:"Pizza napolitana",desc:"Salsa, mozzarella, tomate fresco y albahaca.",precio:"$230/porción"}
    ],
    resenas:[
      {user:"Camila T.",stars:5,fecha:"Hace 4 días",texto:"La fugazzeta es enorme y tiene mucho queso."},
      {user:"Mateo B.",stars:4,fecha:"Hace 2 semanas",texto:"Muy buena relación precio-calidad."}
    ]},
  { id:4, nombre:"Panchos Don Óscar", tipo:"Panchos y refrescos", emoji:"🌭",
    barrio:"Punta Carretas, Montevideo", lat:-34.924, lng:-56.160,
    rating:4.3, reviews:203, estado:"cerrado",
    horario:"Lun–Vie 17:00–00:00 · Sáb–Dom 12:00–02:00",
    telefono:"+598 93 456 789", especialidad:"Pancho triple", cats:["Panchos"],
    menu:[
      {nombre:"Pancho triple",desc:"Tres salchichas en pan extra largo.",precio:"$220"},
      {nombre:"Pancho clásico",desc:"Salchicha en pan con mostaza y ketchup.",precio:"$120"}
    ],
    resenas:[
      {user:"Fernanda L.",stars:5,fecha:"Hace 1 semana",texto:"Don Óscar lleva 20 años en la esquina."},
      {user:"Tomás C.",stars:4,fecha:"Hace 3 semanas",texto:"Los refrescos artesanales son excelentes."}
    ]},
  { id:5, nombre:"El Carrito de Canelones", tipo:"Chivitos y empanadas", emoji:"🥙",
    barrio:"Canelones ciudad", lat:-34.524, lng:-56.284,
    rating:4.7, reviews:55, estado:"abierto",
    horario:"Lun–Dom 10:00–22:00",
    telefono:"+598 95 678 901", especialidad:"Empanadas caseras", cats:["Chivitos","Empanadas"],
    menu:[
      {nombre:"Empanada de carne",desc:"Masa artesanal, carne picada con aceitunas.",precio:"$85"},
      {nombre:"Combo 6 empanadas",desc:"Seis empanadas a elección más refresco.",precio:"$580"}
    ],
    resenas:[
      {user:"Sofía M.",stars:5,fecha:"Hace 2 días",texto:"Las mejores empanadas del interior."},
      {user:"Diego N.",stars:5,fecha:"Hace 1 semana",texto:"Atención familiar y todo muy rico."}
    ]}
];

// ════════════════════════════════════════════════════════════
//  DATOS DE PLANES
// ════════════════════════════════════════════════════════════
var PLANES = [
  {
    id:'gratis', nombre:'Gratis', emoji:'🆓', precio:0, periodo:'Siempre gratis',
    btnClass:'plan-btn-free', btnLabel:'Plan actual',
    features:[
      {ok:true, txt:'Perfil en el mapa'},
      {ok:true, txt:'Toggle abierto/cerrado'},
      {ok:true, txt:'Hasta 3 fotos'},
      {ok:true, txt:'1 novedad por mes'},
      {ok:true, txt:'Estadisticas basicas (vistas totales)'},
      {ok:false, txt:'Estadisticas avanzadas'},
      {ok:false, txt:'Fotos ilimitadas'},
      {ok:false, txt:'Novedades ilimitadas'},
      {ok:false, txt:'Responder resenas'},
      {ok:false, txt:'Badge destacado en el mapa'},
      {ok:false, txt:'Posicion prioritaria en busquedas'},
    ]
  },
  {
    id:'pro', nombre:'Pro', emoji:'⭐', precio:490, periodo:'por mes',
    popular:true, btnClass:'plan-btn-pro', btnLabel:'Elegir Pro',
    features:[
      {ok:true, txt:'Todo lo del plan Gratis'},
      {ok:true, txt:'Fotos ilimitadas'},
      {ok:true, txt:'Novedades ilimitadas'},
      {ok:true, txt:'Estadisticas avanzadas (horarios pico, fuente de visitas)'},
      {ok:true, txt:'Responder resenas de clientes'},
      {ok:true, txt:'Editar menu desde la app'},
      {ok:false, txt:'Badge destacado en el mapa'},
      {ok:false, txt:'Posicion prioritaria en busquedas'},
    ]
  },
  {
    id:'destacado', nombre:'Destacado', emoji:'🏆', precio:990, periodo:'por mes',
    destacado:true, btnClass:'plan-btn-dest', btnLabel:'Elegir Destacado',
    features:[
      {ok:true, txt:'Todo lo del plan Pro'},
      {ok:true, txt:'Badge dorado en el mapa'},
      {ok:true, txt:'Posicion prioritaria en busquedas'},
      {ok:true, txt:'Notificaciones push a clientes cercanos'},
      {ok:true, txt:'Soporte prioritario'},
    ]
  }
];
