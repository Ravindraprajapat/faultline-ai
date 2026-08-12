export async function fetchWardPolygon(wardName) {
  try {
    const searchName = wardName.includes(' - ')
      ? wardName.split(' - ').slice(1).join(' - ').trim()
      : wardName.trim()

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(searchName + ', Vadodara, Gujarat, India')}` +
      `&format=json&limit=1&polygon_geojson=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    if (!data.length || !data[0].geojson) return null
    return geojsonToLatLngs(data[0].geojson)
  } catch (e) {
    console.error('Ward polygon fetch error:', e)
    return null
  }
}

function geojsonToLatLngs(geojson) {
  if (geojson.type === 'Polygon') {
    return geojson.coordinates[0].map(([lng, lat]) => [lat, lng])
  }
  if (geojson.type === 'MultiPolygon') {
    const rings = geojson.coordinates.map(p => p[0])
    const largest = rings.reduce((a, b) => a.length > b.length ? a : b)
    return largest.map(([lng, lat]) => [lat, lng])
  }
  return null
}
