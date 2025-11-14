# Visualización Geográfica 3D - Las Palmas de Gran Canaria

Aplicación web interactiva que visualiza el barrio de Mesa y López en Las Palmas de Gran Canaria en 3D, utilizando datos reales de OpenStreetMap (OSM) y Three.js. Incluye características avanzadas como ciclo día-noche dinámico, dos modos de cámara (orbital y primera persona), y sistemas de colisión.

## Características Principales

### Visualización Geográfica
- **Carga de datos OSM**: Importa automáticamente edificios y calles desde archivos OpenStreetMap
- **Edificios 3D**: Extrusión procedural de polígonos OSM con alturas variables y colores realistas
- **Calles y puntos de interés**: Representación de vías y marcadores en las coordenadas exactas
- **Mapa base**: Fondo de mapa PNG superpuesto como referencia visual
- **Escalado adaptable**: Sistema de escala (worldScale) para ajustar proporciones

### Ciclo Día-Noche Dinámico
- **Ciclo de 3 minutos**: Simula un día completo en tiempo real
- **Sol y Luna dinámicos**: Posicionamiento realista según la hora
- **Campo de estrellas**: 1000 estrellas que aparecen durante la noche
- **Iluminación adaptativa**: Brillo ambiental que cambia según la hora
- **Colores de cielo interpolados**: 12 keyframes de color que transicionan suavemente
- **Reloj en pantalla**: Muestra la hora actual del ciclo (00:00 - 23:59)

### Modos de Cámara
#### Vista Orbital (Predeterminada)
- **Rotación**: Click izquierdo + arrastrar
- **Zoom**: Rueda del ratón
- **Movimiento**: Click derecho + arrastrar
- **Amortiguación**: Movimiento suave con damping

#### Vista Primera Persona
- **Movimiento**: WASD (W adelante, S atrás, A izquierda, D derecha)
- **Mirada**: Movimiento del ratón (requiere bloqueo de puntero)
- **Bloqueo de puntero**: Click en la pantalla para activar/desactivar
- **Velocidad configurable**: Movimiento adaptado al factor de escala

### Sistemas de Colisión
- **Detección de colisiones**: Impide atravesar edificios en primera persona
- **Deslizamiento**: Permite deslizarse sobre los lados de obstáculos
- **Límites del mapa**: Confina el movimiento dentro del área visible
- **Bounding boxes**: Cálculo automático de cajas de colisión para cada edificio

### Interfaz de Usuario
- **Encabezado con información**: Título y ubicación del proyecto
- **Panel de controles**: Instrucciones detalladas de uso
- **Indicador de vista**: Notificaciones al cambiar entre modos
- **Reloj digital**: Muestra la hora actual del ciclo día-noche
- **Diseño responsivo**: Se adapta a cualquier resolución de pantalla

## Instalación

### Requisitos Previos
- Node.js 14 o superior
- npm o yarn
- Un navegador moderno con soporte WebGL

### Pasos de Instalación

1. **Clona el repositorio**
   ```bash
   git clone https://github.com/Carlosqchao/IG_S8.git
   cd IG_S8
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```

3. **Inicia el servidor de desarrollo**
   ```bash
   npm start
   ```
   La aplicación se abrirá automáticamente en tu navegador en `http://localhost:1234`

4. **(Opcional) Compilar para producción**
   ```bash
   npm run build
   ```

## Estructura del Proyecto

```
IG_S8/
├── src/
│   ├── script_entrega.js       # Script principal con toda la lógica
│   ├── index.html              # Archivo HTML de entrada
│   ├── mapLPGC_MyL2025.osm    # Datos de OpenStreetMap (Mesa y López)
│   └── mapaLPGC.png            # Imagen de referencia del mapa
├── package.json                # Dependencias y scripts
└── README.md                   # Este archivo
```

## Guía de Uso

### Controles Generales
| Acción | Control |
|--------|---------|
| Cambiar entre vistas | **V** (mayúscula o minúscula) |

### Vista Orbital
| Acción | Control |
|--------|---------|
| Rotar vista | Click izquierdo + arrastrar |
| Zoom | Rueda del ratón |
| Mover | Click derecho + arrastrar |

### Vista Primera Persona
| Acción | Control |
|--------|---------|
| Mover adelante | **W** |
| Mover atrás | **S** |
| Mover izquierda | **A** |
| Mover derecha | **D** |
| Mirar alrededor | Mover el ratón |
| Bloquear/desbloquear cursor | Click en la pantalla |

## Estadísticas de Datos

El proyecto carga automáticamente:
- **Edificios**: Múltiples estructuras extraídas de OSM con alturas variables
- **Calles**: Red viaria completa de la zona
- **Puntos de interés**: Marcadores a lo largo de las rutas
- **Mapa base**: Imagen PNG de referencia del área

## Configuración Personalizable

En el archivo `script_entrega.js` puedes ajustar:

```javascript
// Coordenadas del mapa (rango de latitud/longitud)
let minlon = -15.46945, maxlon = -15.39203;
let minlat = 28.07653, maxlat = 28.18235;

// Factor de escala global
const worldScale = 5;

// Duración del ciclo día-noche (en milisegundos)
const cycleDuration = 3 * 60 * 1000; // 3 minutos

// Velocidad de movimiento en primera persona
let moveSpeed = 0.08;

// Velocidad de rotación de cámara
let lookSpeed = 0.002;
```

## Funcionalidades Técnicas

### Sistemas de Iluminación
- **Luz ambiental**: Varía según la hora del ciclo (0.2 - 0.8 de intensidad)
- **Luz direccional**: Simula al sol con sombras dinámicas
- **Emisión**: Efectos luminosos en edificios y puntos de interés
- **Niebla atmosférica**: Aumenta inmersión visual (100 - 500 unidades)

### Geometría y Materialización
- **ExtrudeGeometry**: Convierte polígonos OSM en edificios 3D
- **MeshStandardMaterial**: Materiales realistas con rugosidad y metalness
- **BufferGeometry**: Optimización de puntos de estrellas (1000 puntos)
- **Sombras**: PCF Soft Shadows para sombras suaves y realistas

### Gestión de Datos OSM
- **Parsing XML**: Extrae nodos y formas de archivos OSM
- **Mapeo de coordenadas**: Convierte lat/lon a coordenadas 3D
- **Identificación de features**: Clasifica edificios, calles y puntos
- **Datos de ejemplo**: Genera edificios procedurales si falla la carga OSM

### Física y Colisiones
- **Box3**: Cálculo automático de cajas limitantes
- **Detección AABB**: Intersección de cajas alineadas con los ejes
- **Deslizamiento multi-eje**: Movimiento natural contra obstáculos
- **Límites de mapa**: Confinamiento del jugador dentro del área

## Recursos Externos

- **Datos OSM**: Archivo `mapLPGC_MyL2025.osm` (OpenStreetMap)
- **Mapa base**: Imagen `mapaLPGC.png` (referencia visual)
- **Three.js OrbitControls**: Incluido en el bundle de Three.js
