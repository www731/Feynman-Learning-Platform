import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import apiClient from '../api/axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { listKnowledgePoints } from '../api/knowledgePoints';

type NodeItem = { id: string; name: string; value: string; symbolSize: number; status?: string; reviewList?: boolean; createdAt?: string };
type LinkItem = { source: string; target: string; label?: any };

export default function GraphPage() {
  const [option, setOption] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<NodeItem | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<{ name: string; content: string; createdAt?: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        let data: { nodes: NodeItem[]; links: LinkItem[] } | null = null;
        try {
          const r1 = await apiClient.get('/graph/knowledge-map');
          data = r1.data;
        } catch {
          try {
            const r2 = await apiClient.get('/ai/knowledge-map');
            data = r2.data;
          } catch {
            const kpRes = await apiClient.get('/knowledge-points');
            const kps = kpRes.data as any[];
            const nodes: NodeItem[] = kps.map(kp => ({
              id: kp._id,
              name: kp.title,
              value: String(kp.content || '').slice(0, 100),
              symbolSize: 20 + Math.min(String(kp.content || '').length / 50, 30),
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
                if (c.includes(t)) links.push({ source: kp._id, target: titleMap.get(t)!, label: { show: true, formatter: '引用' } });
              }
            }
            const tagMap = new Map<string, Set<string>>();
            for (const kp of kps) {
              const tags = Array.isArray(kp.tags) ? kp.tags : [];
              for (const raw of tags) {
                const key = String(raw || '').trim().toLowerCase();
                if (!key) continue;
                if (!tagMap.has(key)) tagMap.set(key, new Set<string>());
                tagMap.get(key)!.add(kp._id);
              }
            }
            for (const ids of Array.from(tagMap.values())) {
              const arr = Array.from(ids);
              for (let i = 0; i < arr.length; i++) {
                for (let j = i + 1; j < arr.length; j++) {
                  links.push({ source: arr[i], target: arr[j], label: { show: true, formatter: '标签' } });
                }
              }
            }
            data = { nodes, links };
          }
        }
        const coloredNodes = data!.nodes.map(n => ({
          ...n,
          itemStyle: {
            color: n.reviewList ? '#ff4d4f' : '#007bff',
          },
        }));
        const opt = {
          tooltip: {
            formatter: (params: any) => {
              if (params?.dataType === 'node') {
                const d = params.data as NodeItem;
                const created = d.createdAt ? new Date(d.createdAt).toLocaleString() : '';
                return `标题：${d.name}<br/>创建时间：${created}`;
              }
              return params?.name || '';
            }
          },
          series: [
            {
              type: 'graph',
              layout: 'force',
              data: coloredNodes,
              links: data!.links,
              roam: true,
              label: { show: true, position: 'right', formatter: '{b}' },
              force: { repulsion: 100, edgeLength: 50 },
              emphasis: { focus: 'adjacency', lineStyle: { width: 6 } },
            },
          ],
        };
        setOption(opt);
      } catch (e: any) {
        setError(e?.message || '加载失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleClick = async (params: any) => {
    if (params?.componentType === 'series' && params?.dataType === 'node') {
      const n = params.data as NodeItem;
      setSelected(n);
      try {
        const all = await listKnowledgePoints();
        const kp = all.find(k => k.id === n.id);
        if (kp) {
          setSelectedDetail({ name: kp.title, content: kp.content || '', createdAt: kp.createdAt.toISOString?.() });
        } else {
          setSelectedDetail({ name: n.name, content: n.value || '', createdAt: undefined });
        }
      } catch {
        setSelectedDetail({ name: n.name, content: n.value || '', createdAt: undefined });
      }
    }
  };

  if (loading) return <div className="text-gray-700">正在生成知识图谱...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">知识图谱</h2>
      <ReactECharts option={option} style={{ height: '600px', width: '100%' }} onEvents={{ click: handleClick }} />
      {selected && (
        <div className="border rounded-lg p-4 bg-white shadow">
          <div className="text-lg font-semibold mb-2">{selected.name}</div>
          {selectedDetail && selectedDetail.createdAt && (
            <div className="text-gray-500 text-xs mb-2">{new Date(selectedDetail.createdAt).toLocaleString()}</div>
          )}
          <div className="text-gray-700">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {selectedDetail?.content ?? selected.value}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
