import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [userType, setUserType] = useState<'admin' | 'affiliate' | null>(null);

  const validateTokenQuery = trpc.passwordReset.validateToken.useQuery({ token }, { enabled: false });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: '',
    color: 'text-red-500',
  });

  // Extract token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    
    if (!tokenParam) {
      toast.error('Token não encontrado na URL');
      setTimeout(() => setLocation('/admin/login'), 2000);
      return;
    }

    setToken(tokenParam);
    validateToken(tokenParam);
  }, [setLocation]);

  // Validate token
  const validateToken = async (tokenValue: string) => {
    setIsValidating(true);
    try {
      // TODO: Implementar chamada ao backend para validar token
      // const result = await trpc.passwordReset.validateToken.query({ token: tokenValue });
      // if (result.valid) {
      //   setTokenValid(true);
      //   setUserType(result.userType);
      // } else {
      //   toast.error('Token inválido ou expirado');
      //   setTimeout(() => setLocation('/admin/login'), 2000);
      // }
      
      // Simulação para teste
      setTokenValid(true);
      setUserType('affiliate');
      toast.success('Token validado com sucesso');
    } catch (error) {
      toast.error('Erro ao validar token');
      setTimeout(() => setLocation('/admin/login'), 2000);
    } finally {
      setIsValidating(false);
      setIsLoading(false);
    }
  };

  // Calculate password strength
  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    let message = '';
    let color = 'text-red-500';

    if (!password) {
      setPasswordStrength({ score: 0, message: '', color: 'text-gray-500' });
      return;
    }

    // Length check
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Uppercase check
    if (/[A-Z]/.test(password)) score += 1;

    // Lowercase check
    if (/[a-z]/.test(password)) score += 1;

    // Number check
    if (/[0-9]/.test(password)) score += 1;

    // Special character check
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

    if (score <= 2) {
      message = 'Senha fraca';
      color = 'text-red-500';
    } else if (score <= 4) {
      message = 'Senha média';
      color = 'text-yellow-500';
    } else {
      message = 'Senha forte';
      color = 'text-green-500';
    }

    setPasswordStrength({ score, message, color });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, password: value }));
    calculatePasswordStrength(value);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, confirmPassword: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!formData.password) {
      toast.error('Digite uma nova senha');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (passwordStrength.score <= 2) {
      toast.error('Senha muito fraca. Use uma combinação de letras, números e símbolos');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implementar chamada ao backend para redefinir senha
      // const result = await trpc.passwordReset.resetPassword.mutate({
      //   token,
      //   newPassword: formData.password,
      // });
      
      // Simulação para teste
      toast.success('Senha redefinida com sucesso!');
      setTimeout(() => {
        if (userType === 'admin') {
          setLocation('/admin/login');
        } else {
          setLocation('/afiliados/login');
        }
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao redefinir senha');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isValidating) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-16">
        <p className="text-gold">Validando token...</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-16 px-4">
        <Card className="bg-black border-gold/20 p-8 max-w-md w-full">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gold mb-4 text-center">Token Inválido</h2>
          <p className="text-gray-400 mb-6 text-center">
            O link de redefinição de senha é inválido ou expirou. Por favor, solicite um novo link.
          </p>
          <Button
            onClick={() => setLocation('/admin/login')}
            className="w-full bg-gold text-black hover:bg-gold/90 font-semibold"
          >
            Voltar ao Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center pt-16 px-4">
      <Card className="bg-black border-gold/20 p-8 max-w-md w-full">
        <div className="flex justify-center mb-4">
          <Lock className="w-12 h-12 text-gold" />
        </div>
        <h1 className="text-3xl font-bold text-gold mb-2 text-center">Redefinir Senha</h1>
        <p className="text-gray-400 text-sm text-center mb-6">
          Digite sua nova senha abaixo
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-gold text-sm font-semibold mb-2">Nova Senha</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Digite sua nova senha"
                value={formData.password}
                onChange={handlePasswordChange}
                className="bg-black border-gold/30 text-white pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gold"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1 rounded-full transition-colors ${
                        i < passwordStrength.score
                          ? passwordStrength.color === 'text-green-500'
                            ? 'bg-green-500'
                            : passwordStrength.color === 'text-yellow-500'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                          : 'bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${passwordStrength.color}`}>
                  {passwordStrength.message}
                </p>
              </div>
            )}

            <p className="text-gray-400 text-xs mt-2">
              Mínimo 6 caracteres. Use letras maiúsculas, minúsculas, números e símbolos para melhor segurança.
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-gold text-sm font-semibold mb-2">Confirmar Senha</label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirme sua nova senha"
                value={formData.confirmPassword}
                onChange={handleConfirmPasswordChange}
                className="bg-black border-gold/30 text-white pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gold"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Match Indicator */}
            {formData.confirmPassword && (
              <div className="mt-2 flex items-center gap-2">
                {formData.password === formData.confirmPassword ? (
                  <>
                    <CheckCircle size={16} className="text-green-500" />
                    <p className="text-xs text-green-500">Senhas coincidem</p>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} className="text-red-500" />
                    <p className="text-xs text-red-500">Senhas não coincidem</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !formData.password || !formData.confirmPassword}
            className="w-full bg-gold text-black hover:bg-gold/90 font-semibold mt-6"
          >
            {isSubmitting ? 'Redefinindo...' : 'Redefinir Senha'}
          </Button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Lembrou sua senha?{' '}
            <button
              onClick={() => {
                if (userType === 'admin') {
                  setLocation('/admin/login');
                } else {
                  setLocation('/afiliados/login');
                }
              }}
              className="text-gold hover:text-gold/80 font-semibold"
            >
              Voltar ao Login
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}
