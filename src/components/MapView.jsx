import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function MapView({ emergencies = [], evacCenters = [], onAssign = ()=>{}, onCreateEvac = ()=>{} }){
  const mapRef = useRef(null)
  useEffect(()=>{
    if(!mapRef.current){
      mapRef.current = L.map('map').setView([14.6, 121.0], 11)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '' }).addTo(mapRef.current)

      // click handler to create evac center
      mapRef.current.on('click', (e)=>{
        const { lat, lng } = e.latlng
        const name = window.prompt('Create evac center name (optional)')
        if(name !== null){
          // Provide minimal required fields (address and capacity) so backend validation passes
          const payload = {
            name: name || 'Evac Center',
            address: `Lat:${lat.toFixed(5)} Lng:${lng.toFixed(5)}`,
            capacity: 20,
            location: { lat, lng }
          }
          onCreateEvac(payload)
        }
      })
    }

    const existing = mapRef.current._markerLayer
    if(existing) existing.clearLayers()
    const layer = L.layerGroup().addTo(mapRef.current)
    mapRef.current._markerLayer = layer

    const makeIcon = (color, size=14) => {
      // Prefer divIcon when available (normal Leaflet). Some bundlers/export variants
      // might not expose divIcon; fall back to an image-based icon using an inline SVG data URL.
      if (typeof L.divIcon === 'function') {
        return L.divIcon({ className: 'custom-marker', html: `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 0 10px ${color}88"></span>` })
      }
      // Fallback: create simple SVG circle and use L.icon
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'><circle cx='${size/2}' cy='${size/2}' r='${size/2}' fill='${color}' /></svg>`
      const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
      return L.icon({ iconUrl: url, iconSize: [size, size], iconAnchor: [size/2, size/2] })
    }

    // evac center markers (star-like)
    (evacCenters || []).forEach(c => {
      if(!c.location?.lat) return
      const marker = L.marker([c.location.lat, c.location.lng], { icon: makeIcon('#059669', 16) })
      marker.bindPopup(`<b>${c.name}</b><br/>${c.location.lat.toFixed(4)}, ${c.location.lng.toFixed(4)}`)
      marker.addTo(layer)
    })

    emergencies.forEach(em => {
      if(!em.location?.lat) return
      // detect special/medical conditions on reported user if present
      let hasSpecial = false
      try{
        const user = em.user || em.reporter || em.payload?.user || {}
        const special = user.specialCircumstances || user.special || user.specialCircumstance || []
        const medical = user.medicalConditions || user.medical || []
        hasSpecial = (Array.isArray(special) ? special.length>0 : !!special) || (Array.isArray(medical) ? medical.length>0 : !!medical)
      }catch(e){}
      const color = hasSpecial ? '#7c3aed' : (em.priority === 'high' ? '#ef4444' : em.priority === 'medium' ? '#f59e0b' : '#3b82f6')
      const size = hasSpecial ? 20 : 14
      const m = L.marker([em.location.lat, em.location.lng], { icon: makeIcon(color, size) }).addTo(layer)
      m.bindPopup(`<b>${em.type}</b><br/>${em.description || ''}<br/><button id=assign-${em.id}>Assign</button>`)
      m.on('popupopen', ()=> setTimeout(()=>{ const btn = document.getElementById(`assign-${em.id}`); if(btn) btn.onclick = ()=> onAssign(em) },50))
    })
    
    // cleanup handler when component unmounts or dependencies change
    return () => {
      try{
        if(mapRef.current){
          mapRef.current.off()
          // do not fully remove map if you want to persist; remove to avoid duplicate instances
          mapRef.current.remove()
          mapRef.current = null
        }
      }catch(e){ /* ignore cleanup errors */ }
    }
  }, [emergencies, evacCenters, onAssign, onCreateEvac])

  return <div id="map" style={{ width: '100%', height: 520, borderRadius: 8 }} />
}
