import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import * as d3 from 'd3-force-3d'
import apiClient from '../api/axios'
import { updateKnowledgePoint } from '../api/knowledgePoints'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

type NodeItem = { id: string; name: string; content?: string; status?: string; reviewList?: boolean; createdAt?: string }
type LinkItem = { source: string; target: string }
type GraphData = { nodes: NodeItem[]; links: LinkItem[] }

export default function KnowledgeUniversePage() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<NodeItem | null>(null)
  const addSelectedToReview = async () => {
    if (!selected) return
    try {
      await updateKnowledgePoint(selected.id, { reviewList: true })
      setSelected({ ...selected, reviewList: true })
      setGraphData(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id === selected.id ? { ...n, reviewList: true } : n) }))
    } catch {}
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        let data: GraphData | null = null
        try {
          const kpRes = await apiClient.get('/knowledge-points')
          const kps = kpRes.data as any[]
          const nodes: NodeItem[] = kps.map(kp => ({ id: kp._id, name: kp.title, content: kp.content, status: kp.status, reviewList: kp.reviewList, createdAt: kp.createdAt }))
          const titleMap = new Map(nodes.map(n => [n.name, n.id]))
          const links: LinkItem[] = []
          for (const kp of kps) {
            for (const t of Array.from(titleMap.keys())) {
              if (kp.title === t) continue
              const c = String(kp.content || '')
              if (c.includes(t)) links.push({ source: kp._id, target: titleMap.get(t)! })
            }
          }
          const tagMap = new Map<string, Set<string>>()
          for (const kp of kps) {
            const tags = Array.isArray(kp.tags) ? kp.tags : []
            for (const raw of tags) {
              const key = String(raw || '').trim().toLowerCase()
              if (!key) continue
              if (!tagMap.has(key)) tagMap.set(key, new Set<string>())
              tagMap.get(key)!.add(kp._id)
            }
          }
          for (const ids of Array.from(tagMap.values())) {
            const arr = Array.from(ids)
            for (let i = 0; i < arr.length; i++) {
              for (let j = i + 1; j < arr.length; j++) {
                links.push({ source: arr[i], target: arr[j] })
              }
            }
          }
          data = { nodes, links }
        } catch {
          try {
            const r1 = await apiClient.get('/graph/knowledge-map')
            data = r1.data
          } catch {
            const r2 = await apiClient.get('/ai/knowledge-map')
            data = r2.data
          }
        }
        if (data) setGraphData(data)
        else setError('无法加载图谱数据')
      } catch (e: any) {
        setError(e.message || '加载失败')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!mountRef.current) return
    const currentMount = mountRef.current
    if (graphData.nodes.length === 0) return

    while (currentMount.firstChild) currentMount.removeChild(currentMount.firstChild)
    const rect = currentMount.getBoundingClientRect()
    const iw = Math.max(1, Math.floor(rect.width || currentMount.offsetWidth || 800))
    const ih = Math.max(1, Math.floor(rect.height || currentMount.offsetHeight || 600))

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000010)
    const camera = new THREE.PerspectiveCamera(75, iw / ih, 0.1, 1000)
    camera.position.z = 20
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    const pointLight = new THREE.PointLight(0xffffff, 0.9)
    pointLight.position.set(12, 8, 10)
    const nebulaA = new THREE.PointLight(0x4f46e5, 0.6)
    nebulaA.position.set(-15, -8, -12)
    const nebulaB = new THREE.PointLight(0x00c2ff, 0.5)
    nebulaB.position.set(18, 12, 14)
    scene.add(ambientLight)
    scene.add(pointLight)
    scene.add(nebulaA)
    scene.add(nebulaB)
    scene.fog = new THREE.FogExp2(0x000010, 0.002)

    const sunGeo = new THREE.SphereGeometry(2.0, 32, 32)
    const sunMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.4, metalness: 0.1, emissive: new THREE.Color(0xffaa00), emissiveIntensity: 1.2 })
    const sun = new THREE.Mesh(sunGeo, sunMat)
    sun.position.set(0, 0, 0)
    scene.add(sun)
    const sunLight = new THREE.PointLight(0xffdd55, 1.1, 100)
    sunLight.position.set(0, 0, 0)
    scene.add(sunLight)

    const starGeo = new THREE.BufferGeometry()
    const starCount = Math.min(3000, graphData.nodes.length * 50 + 1000)
    const starPositions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 600
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 600
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 600
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, sizeAttenuation: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
    const stars = new THREE.Points(starGeo, starMat)
    stars.renderOrder = -1
    scene.add(stars)

    const composer = new EffectComposer(renderer)
    const rp = new RenderPass(scene, camera)
    const bloom = new UnrealBloomPass(new THREE.Vector2(iw, ih), 0.8, 0.4, 0.85)
    composer.addPass(rp)
    composer.addPass(bloom)

    const getColor = (n: NodeItem) => (n.reviewList ? 0xff4d4f : 0x007bff)

    const sphereGeometry = new THREE.SphereGeometry(0.8, 16, 16)
    const nodeMeshes: Map<string, THREE.Mesh> = new Map()
    const haloMeshes: Map<string, THREE.Mesh> = new Map()
    const rings: THREE.LineLoop[] = []
    const ringMatGroup = new THREE.LineBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.35 })
    const ringMatSingle = new THREE.LineBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.2 })
    const adj = new Map<string, Set<string>>()
    graphData.nodes.forEach(n => adj.set(n.id, new Set()))
    graphData.links.forEach(l => {
      if (adj.has(l.source)) adj.get(l.source)!.add(l.target)
      if (adj.has(l.target)) adj.get(l.target)!.add(l.source)
    })
    const components: string[][] = []
    const visited = new Set<string>()
    for (const n of graphData.nodes) {
      if (visited.has(n.id)) continue
      const comp: string[] = []
      const q: string[] = [n.id]
      visited.add(n.id)
      while (q.length) {
        const cur = q.shift()!
        comp.push(cur)
        for (const nb of Array.from(adj.get(cur) || [])) {
          if (!visited.has(nb)) { visited.add(nb); q.push(nb) }
        }
      }
      components.push(comp)
    }

    graphData.nodes.forEach(n => {
      const m = new THREE.MeshStandardMaterial({ color: getColor(n), roughness: 0.35, metalness: 0.2, emissive: new THREE.Color(getColor(n)), emissiveIntensity: 0.3 })
      const mesh = new THREE.Mesh(sphereGeometry, m)
      mesh.position.set(0, 0, 0)
      mesh.userData = { id: n.id, name: n.name, originalColor: getColor(n), phase: Math.random() * Math.PI * 2, baseScale: 0.8 }
      scene.add(mesh)
      nodeMeshes.set(n.id, mesh)
      const haloGeo = new THREE.SphereGeometry(1.2, 16, 16)
      const haloMat = new THREE.MeshBasicMaterial({ color: getColor(n), transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending })
      const halo = new THREE.Mesh(haloGeo, haloMat)
      scene.add(halo)
      haloMeshes.set(n.id, halo)
    })

    const relatedComps = components.filter(c => c.length > 1)
    const singles = components.filter(c => c.length === 1 && (adj.get(c[0])?.size || 0) === 0).map(c => c[0])
    const baseRadius = 6
    const spacing = 3
    const makeRing = (rx: number, ry: number, tiltX: number, tiltY: number, mat: THREE.LineBasicMaterial) => {
      const seg = 256
      const pos = new Float32Array(seg * 3)
      const euler = new THREE.Euler(tiltX, tiltY, 0)
      const v = new THREE.Vector3()
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * Math.PI * 2
        v.set(rx * Math.cos(a), ry * Math.sin(a), 0).applyEuler(euler)
        pos[i * 3] = v.x
        pos[i * 3 + 1] = v.y
        pos[i * 3 + 2] = v.z
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      const ring = new THREE.LineLoop(g, mat)
      scene.add(ring)
      rings.push(ring)
    }
    relatedComps.forEach((comp, idx) => {
      const rx = baseRadius + idx * spacing
      const ry = rx * (1.0 + (Math.random() * 0.4 - 0.2))
      const speedG = 0.02 + idx * 0.003 + Math.random() * 0.005
      const tiltX = Math.random() * 0.8 - 0.4
      const tiltY = Math.random() * 0.8 - 0.4
      const mainId = comp.slice().sort((a, b) => ((adj.get(b)?.size || 0) - (adj.get(a)?.size || 0)))[0]
      const phaseG = Math.random() * Math.PI * 2
      comp.forEach((id, j) => {
        const mesh = nodeMeshes.get(id)!
        if (id === mainId) {
          mesh.userData.groupOrbit = { rx, ry, speed: speedG, phase: phaseG, tiltX, tiltY }
          mesh.userData.isMain = true
          mesh.userData.baseScale = 1.0
        } else {
          const rLocal = 2.2 + (j % 6) * 0.6 + Math.random() * 0.5
          const speedL = 0.6 * speedG + Math.random() * 0.2
          const phaseL = (j / Math.max(1, comp.length - 1)) * Math.PI * 2 + Math.random() * 0.8
          mesh.userData.groupOrbit = { rx, ry, speed: speedG, phase: phaseG, tiltX, tiltY }
          mesh.userData.localOrbit = { r: rLocal, speed: speedL, phase: phaseL }
          mesh.userData.baseScale = 0.6
        }
      })
      makeRing(rx, ry, tiltX, tiltY, ringMatGroup)
    })
    singles.forEach((id, idx) => {
      const rx = baseRadius + relatedComps.length * spacing + 2 + (idx % 6) * 1.2 + Math.random() * 0.8
      const ry = rx * (1.0 + (Math.random() * 0.5 - 0.25))
      const speed = 0.015 + Math.random() * 0.01
      const tiltX = Math.random() * 1.0 - 0.5
      const tiltY = Math.random() * 1.0 - 0.5
      const mesh = nodeMeshes.get(id)!
      mesh.userData.orbit = { rx, ry, speed, phase: Math.random() * Math.PI * 2, tiltX, tiltY }
      makeRing(rx, ry, tiltX, tiltY, ringMatSingle)
      mesh.userData.baseScale = 0.75
    })

    const linkMaterial = new THREE.LineBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.6 })
    const linkSegments: { line: THREE.Line; a: THREE.Mesh; b: THREE.Mesh }[] = []
    graphData.links.forEach(l => {
      const a = nodeMeshes.get(l.source)
      const b = nodeMeshes.get(l.target)
      if (a && b) {
        const g = new THREE.BufferGeometry().setFromPoints([a.position, b.position])
        const line = new THREE.Line(g, linkMaterial)
        scene.add(line)
        linkSegments.push({ line, a, b })
      }
    })

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(-2, -2)
    let hovered: THREE.Object3D | null = null

    const onMove = (e: MouseEvent) => {
      const r = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1
    }

    const onClick = () => {
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(Array.from(nodeMeshes.values()))
      if (hits.length > 0) {
        const obj = hits[0].object as THREE.Mesh
        const id = obj.userData.id as string
        const d = graphData.nodes.find(n => n.id === id) || null
        setSelected(d)
      }
    }

    const animate = () => {
      requestAnimationFrame(animate)
      const t = performance.now() * 0.001
      graphData.nodes.forEach(n => {
        const mesh = nodeMeshes.get(n.id)!
        const go = mesh.userData.groupOrbit
        const lo = mesh.userData.localOrbit
        const ob = mesh.userData.orbit
        if (go) {
          const angG = go.phase + t * go.speed * 2
          const e = new THREE.Euler(go.tiltX, go.tiltY, 0)
          const vg = new THREE.Vector3(go.rx * Math.cos(angG), go.ry * Math.sin(angG), 0).applyEuler(e)
          if (mesh.userData.isMain) {
            mesh.position.copy(vg)
          } else if (lo) {
            const angL = lo.phase + t * lo.speed * 2
            const vl = new THREE.Vector3(lo.r * Math.cos(angL), lo.r * Math.sin(angL), 0).applyEuler(e)
            mesh.position.copy(vg.clone().add(vl))
          }
          const phase = mesh.userData.phase || 0
          const sScale = 1 + 0.08 * Math.sin(t + phase)
          const base = mesh.userData.baseScale || 1
          const finalScale = base * sScale
          mesh.scale.set(finalScale, finalScale, finalScale)
          const halo = haloMeshes.get(mesh.userData.id as string)
          if (halo) {
            halo.position.copy(mesh.position)
            halo.scale.set(finalScale * 1.1, finalScale * 1.1, finalScale * 1.1)
          }
        } else if (ob) {
          const ang = ob.phase + t * ob.speed * 2
          const e = new THREE.Euler(ob.tiltX, ob.tiltY, 0)
          const v = new THREE.Vector3(ob.rx * Math.cos(ang), ob.ry * Math.sin(ang), 0).applyEuler(e)
          mesh.position.copy(v)
          const phase = mesh.userData.phase || 0
          const sScale = 1 + 0.08 * Math.sin(t + phase)
          const base = mesh.userData.baseScale || 1
          const finalScale = base * sScale
          mesh.scale.set(finalScale, finalScale, finalScale)
          const halo = haloMeshes.get(mesh.userData.id as string)
          if (halo) {
            halo.position.copy(mesh.position)
            halo.scale.set(finalScale * 1.1, finalScale * 1.1, finalScale * 1.1)
          }
        }
      })
      linkSegments.forEach(seg => {
        ;(seg.line.geometry as THREE.BufferGeometry).setFromPoints([seg.a.position, seg.b.position])
      })
      stars.rotation.y += 0.00015
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(Array.from(nodeMeshes.values()))
      if (hovered && hovered instanceof THREE.Mesh) {
        const oc = hovered.userData.originalColor
        if (oc) (hovered.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000)
        hovered.scale.set(1, 1, 1)
        hovered = null
        document.body.style.cursor = 'default'
      }
      if (intersects.length > 0) {
        const obj = intersects[0].object as THREE.Mesh
        ;(obj.material as THREE.MeshStandardMaterial).emissive.setHex(0x555555)
        obj.scale.set(1.25, 1.25, 1.25)
        hovered = obj
        document.body.style.cursor = 'pointer'
      }
      controls.update()
      composer.render()
    }

    const initCanvas = () => {
      renderer.setSize(iw, ih)
      currentMount.appendChild(renderer.domElement)
      renderer.domElement.addEventListener('mousemove', onMove)
      renderer.domElement.addEventListener('click', onClick)
      animate()
    }

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.max(1, Math.floor(entry.contentRect.width || currentMount.offsetWidth || 800))
        const h = Math.max(1, Math.floor(entry.contentRect.height || currentMount.offsetHeight || 600))
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
        composer.setSize(w, h)
        if (!currentMount.contains(renderer.domElement)) initCanvas()
      }
    })
    ro.observe(currentMount)
    initCanvas()

    return () => {
      ro.disconnect()
      renderer.domElement.removeEventListener('mousemove', onMove)
      renderer.domElement.removeEventListener('click', onClick)
      controls.dispose()
      if (currentMount.contains(renderer.domElement)) currentMount.removeChild(renderer.domElement)
      renderer.dispose()
      sphereGeometry.dispose()
      sunGeo.dispose()
      sunMat.dispose()
      starGeo.dispose()
      starMat.dispose()
      rings.forEach(r => { (r.geometry as THREE.BufferGeometry).dispose() })
      ringMatGroup.dispose()
      ringMatSingle.dispose()
    }
  }, [graphData])

  if (loading) return (
    <div className="flex items-center justify-center h-[600px] text-gray-500 bg-gray-50">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p>正在加载数据...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-[600px] text-red-500 bg-gray-50">
      <p>{error}</p>
    </div>
  )

  const reviewCount = graphData.nodes.filter(n => n.reviewList).length
  const masteredCount = graphData.nodes.filter(n => n.status === 'mastered').length
  const inProgressCount = graphData.nodes.filter(n => n.status === 'in_progress').length
  const notStartedCount = Math.max(0, graphData.nodes.length - reviewCount - masteredCount - inProgressCount)

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
        <h2 className="text-xl font-bold text-gray-800">3D 知识宇宙</h2>
        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">左键旋转 | 右键平移 | 滚轮缩放</div>
      </div>
      <div className="flex-1 w-full relative min-h-[600px] bg-white">
        <div ref={mountRef} className="w-full h-full" />
        {selected && (
          <div className="absolute left-4 bottom-4 bg-white/95 backdrop-blur p-4 rounded-md shadow-lg text-sm max-w-xl space-y-3 max-h-[50vh] overflow-auto text-left">
            <div className="font-semibold text-base text-left">{selected.name}</div>
            {selected.content && (
              <div className="text-gray-700 leading-relaxed text-left">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {selected.content}
                </ReactMarkdown>
              </div>
            )}
            <div className="text-gray-500 text-left">{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : ''}</div>
            <div className="flex gap-2 justify-start">
              <button onClick={addSelectedToReview} className="px-3 py-2 bg-blue-600 text-white rounded-md">{selected.reviewList ? '已加入复习' : '加入复习列表'}</button>
              <button onClick={() => setSelected(null)} className="px-3 py-2 bg-blue-600 text-white rounded-md">关闭</button>
            </div>
          </div>
        )}
        <div className="absolute top-4 left-4 bg-gray-600/70 p-2 rounded-lg backdrop-blur-sm text-xs text-white space-y-2 pointer-events-none">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#ff4d4f]"></span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#007bff]"></span></div>
        </div>
      </div>
    </div>
  )
}
