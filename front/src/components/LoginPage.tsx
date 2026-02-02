import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { GraduationCap } from 'lucide-react';
import apiClient from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isRegisterMode) {
      // 注册逻辑
      if (!username.trim() || !email.trim() || !password.trim()) {
        setError('请填写所有必填字段');
        return;
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
      if (password.length < 6) {
        setError('密码长度至少6位');
        return;
      }
      
      setLoading(true);
      apiClient
        .post('/users/register', { username, email, password })
        .then((res) => {
          const token = res.data?.token;
          if (!token) {
            setError('注册响应缺少token');
            return;
          }
          login(token);
        })
        .catch((err) => {
          const msg = err?.response?.data?.msg || '注册失败，请稍后再试';
          setError(msg);
        })
        .finally(() => setLoading(false));
    } else {
      // 登录逻辑
      if (!username.trim() || !password.trim()) {
        setError('请输入用户名和密码');
        return;
      }
      setLoading(true);
      apiClient
        .post('/users/login', { email: username, password })
        .then((res) => {
          const token = res.data?.token;
          if (!token) {
            setError('登录响应缺少token');
            return;
          }
          login(token);
        })
        .catch((err) => {
          const msg = err?.response?.data?.msg || '登录失败，请检查账号或稍后再试';
          setError(msg);
        })
        .finally(() => setLoading(false));
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white border-gray-200 shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-gray-600" />
          </div>
          <div>
            <CardTitle className="text-gray-900">
              {isRegisterMode ? '注册账户' : '学习平台'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {isRegisterMode 
                ? '创建您的费曼学习平台账户' 
                : '欢迎回来，请登录您的账户'
              }
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700">
                用户名
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
                required
              />
            </div>
            
            {isRegisterMode && (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">
                  邮箱
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="请输入邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">
                密码
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={isRegisterMode ? "请输入密码（至少6位）" : "请输入密码"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
                required
              />
            </div>
            
            {isRegisterMode && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700">
                  确认密码
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="请再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
                  required
                />
              </div>
            )}
            
            {error && (
              <p className="text-red-600 text-sm mt-2">{error}</p>
            )}
            
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? '处理中...' : (isRegisterMode ? '注册' : '登录')}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError('');
                setUsername('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {isRegisterMode 
                ? '已有账户？点击登录' 
                : '没有账户？点击注册'
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
