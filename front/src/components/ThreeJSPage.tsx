import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import apiClient from '../api/axios';

type NodeItem = { id: string; name: string; status?: string; reviewList?: boolean; createdAt?: string };
type LinkItem = { source: string; target: string };
type GraphData = { nodes: NodeItem[]; links: LinkItem[] };

export default function ThreeJSPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 获取数据 (复用GraphPage的稳健逻辑)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let data: GraphData | null = null;
        // 1. 尝试直接计算 (优先)
        try {
          const kpRes = await apiClient.get('/knowledge-points');
          const kps = kpRes.data as any[];
          const nodes: NodeItem[] = kps.map(kp => ({
            id: kp._id,
            name: kp.title,
            status: kp.status,
            reviewList: kp.reviewList,
            createdAt: kp.createdAt,
          }));
          
          const titleMap = new Map(nodes.map(n => [n.name, n.id]));
          const links: LinkItem[] = [];
          
          for (const kp of kps) {
            for (const t of Array.from(titleMap.keys())) {
              if (kp.title === t) continue;
              const c = String(kp.content || '');
              if (c.includes(t)) {
                links.push({ source: kp._id, target: titleMap.get(t)! });
              }
            }
          }
          data = { nodes, links };
        } catch (e) {
          console.warn('本地计算图谱失败，尝试后端接口', e);
          // 2. 降级到后端接口
          try {
            const r1 = await apiClient.get('/graph/knowledge-map');
            data = r1.data;
          } catch {
             // 3. 再次降级
             const r2 = await apiClient.get('/ai/knowledge-map');
             data = r2.data;
          }
        }
        
        if (data) {
          setGraphData(data);
        } else {
          setError('无法加载图谱数据');
        }
      } catch (e: any) {
        setError(e.message || '加载失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Three.js 渲染逻辑
  useEffect(() => {
    if (!mountRef.current) return;
    
    // 如果没有数据，不初始化 Three.js，但在 UI 中会处理显示
    if (graphData.nodes.length === 0) return;

    console.log('Initializing Three.js with data:', graphData);

    const currentMount = mountRef.current;
    // 清理旧的内容，防止重复 append
    while (currentMount.firstChild) {
      currentMount.removeChild(currentMount.firstChild);
    }

    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight;
    if (width === 0 || height === 0) {
        console.warn('Container size is 0, waiting for ResizeObserver to init');
    }

    // 1. 场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // 2. 相机
    const initialWidth = Math.max(1, width);
    const initialHeight = Math.max(1, height);
    const camera = new THREE.PerspectiveCamera(75, initialWidth / initialHeight, 0.1, 1000);
    camera.position.z = 15;

    // 3. 渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio); // 优化清晰度
    // currentMount.appendChild(renderer.domElement); // 移到 ResizeObserver 中

    // 4. 控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // 5. 光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // 6. 创建图谱对象
    const nodeObjects = new Map<string, THREE.Mesh>();
    const sphereGeometry = new THREE.SphereGeometry(0.3, 32, 32); // 稍微调大一点
    
    // 颜色映射 helper
    const getColor = (node: NodeItem) => {
       if (node.reviewList) return 0xff4d4f; // 红色
       if (node.status === 'mastered') return 0x52c41a; // 绿色
       if (node.status === 'in_progress') return 0xfa8c16; // 橙色
       return 0x007bff; // 蓝色
    };

    // 计算布局范围，避免所有点挤在一起
    const layoutScale = Math.max(10, Math.sqrt(graphData.nodes.length) * 2);

    graphData.nodes.forEach(node => {
      const material = new THREE.MeshStandardMaterial({ 
        color: getColor(node),
        roughness: 0.5,
        metalness: 0.1
      });
      const sphere = new THREE.Mesh(sphereGeometry, material);
      
      // 随机分布 - 使用球形分布或立方体分布
      sphere.position.set(
        (Math.random() - 0.5) * layoutScale,
        (Math.random() - 0.5) * layoutScale,
        (Math.random() - 0.5) * layoutScale
      );
      
      sphere.userData = { id: node.id, name: node.name, originalColor: getColor(node) };
      scene.add(sphere);
      nodeObjects.set(node.id, sphere);
    });

    // 创建连线
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.6 });
    
    graphData.links.forEach(link => {
      const sourceNode = nodeObjects.get(link.source);
      const targetNode = nodeObjects.get(link.target);
      
      if (sourceNode && targetNode) {
        const points = [sourceNode.position, targetNode.position];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, lineMaterial);
        scene.add(line);
      }
    });

    // 7. 交互 (Raycaster)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-100, -100); // 初始移出屏幕
    let hoveredObj: THREE.Object3D | null = null;

    const onMouseMove = (event: MouseEvent) => {
        // 如果还没挂载到 DOM，不处理
        if (!renderer.domElement.parentNode) return;
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    
    // 使用 renderer.domElement 添加事件，防止干扰其他区域
    // renderer.domElement.addEventListener('mousemove', onMouseMove); // 移到 initThree 中

    // 8. 动画循环
    let animationId: number;
    const animate = () => {
      // 如果还没初始化，不执行渲染
      if (!renderer.domElement.parentNode) return;

      animationId = requestAnimationFrame(animate);
      controls.update();

      // Raycasting Logic
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);
      
      // 恢复上一个悬停物体的颜色
      if (hoveredObj && hoveredObj instanceof THREE.Mesh) {
          const originalColor = hoveredObj.userData.originalColor;
          if (originalColor !== undefined) {
             (hoveredObj.material as THREE.MeshStandardMaterial).color.setHex(originalColor);
             (hoveredObj.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
          }
          hoveredObj = null;
          document.body.style.cursor = 'default'; // 恢复鼠标样式
      }

      // 处理新的悬停
      const found = intersects.find(i => i.object instanceof THREE.Mesh && i.object.geometry instanceof THREE.SphereGeometry);
      if (found) {
          hoveredObj = found.object;
          if (hoveredObj instanceof THREE.Mesh) {
              // 高亮
              (hoveredObj.material as THREE.MeshStandardMaterial).emissive.setHex(0x666666);
              document.body.style.cursor = 'pointer'; // 鼠标变手型
          }
      }

      renderer.render(scene, camera);
    };
    // animate(); // 移到 initThree 中

    // 9. Resize & Init Logic
    const initThree = (width: number, height: number) => {
        if (renderer.domElement.parentNode) return; // 已经附加了，不再重复

        const rect = currentMount.getBoundingClientRect();
        const w = width > 0 ? width : (rect.width || currentMount.offsetWidth || 800);
        const h = height > 0 ? height : (rect.height || currentMount.offsetHeight || 600);

        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        
        currentMount.appendChild(renderer.domElement);
        renderer.domElement.addEventListener('mousemove', onMouseMove);
        
        // 开始动画
        animate();
    };

    const handleResize = () => {
      if (!currentMount) return;
      const w = currentMount.clientWidth;
      const h = currentMount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
                if (!currentMount.contains(renderer.domElement)) {
                    initThree(width, height);
                } else {
                    handleResize();
                }
            }
        }
    });

    resizeObserver.observe(currentMount);

    // 如果初始就有有效尺寸，立即初始化一次
    initThree(width, height);
    // 同时监听窗口尺寸变化
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
      }
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      controls.dispose();
      if (currentMount && renderer.domElement && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      // Dispose
      sphereGeometry.dispose();
      renderer.dispose();
    };
  }, [graphData]);

  if (loading) return (
    <div className="flex items-center justify-center h-[600px] text-gray-500 bg-gray-50">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p>正在构建3D知识宇宙...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-[600px] text-red-500 bg-gray-50">
      <p>{error}</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span>🌌</span> 3D 知识宇宙
        </h2>
        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
           🖱️ 左键旋转 | 🖱️ 右键平移 | 📜 滚轮缩放
        </div>
      </div>
      
      <div className="flex-1 w-full relative min-h-[600px] bg-white overflow-hidden">
        {graphData.nodes.length === 0 ? (
           <div className="absolute inset-0 flex items-center justify-center text-white/50">
             暂无知识点数据，快去添加一些吧！
           </div>
        ) : (
           <div ref={mountRef} className="w-full h-full" />
        )}
        
        {/* 简单的图例 */}
        <div className="absolute bottom-4 left-4 bg-black/50 p-3 rounded-lg backdrop-blur-sm text-xs text-white space-y-2 pointer-events-none">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#ff4d4f]"></span> 需复习</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#52c41a]"></span> 已掌握</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#fa8c16]"></span> 进行中</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#007bff]"></span> 未开始</div>
        </div>
      </div>
    </div>
  );
}
