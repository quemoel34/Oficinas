'use client';

import { StoredUser, type AuthUser, type PasswordResetRequest, type AccessRequest, Workshop, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { initData } from '@/lib/data-manager';
import { logActivity } from '@/lib/activity-logger';

const USERS_STORAGE_KEY = 'app-users';
const PASSWORD_REQUESTS_KEY = 'app-password-requests';
const ACCESS_REQUESTS_KEY = 'app-access-requests';
const SESSION_KEY = 'app-session';
const SESSION_EXPIRATION_MS = 5 * 24 * 60 * 60 * 1000; // 5 days
const IMMUTABLE_ADMIN = 'quemoel457359';

interface StoredSession {
  user: AuthUser;
  loginTimestamp: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (name: string, pass: string) => boolean;
  logout: () => void;
  registerUser: (name: string, pass: string, role?: UserRole) => boolean;
  updateUser: (name: string, updates: Partial<Pick<StoredUser, 'role' | 'status'>>) => boolean;
  deleteUser: (name: string) => boolean;
  getUsers: () => StoredUser[];
  requestPasswordReset: (name: string, newPass: string) => boolean;
  getPendingPasswordRequests: () => PasswordResetRequest[];
  approvePasswordReset: (name: string) => boolean;
  denyPasswordReset: (name: string) => boolean;
  requestAccess: (data: Omit<AccessRequest, 'id' | 'requestedAt' | 'status'>) => boolean;
  getAccessRequests: () => AccessRequest[];
  approveAccessRequest: (requestId: string, role: UserRole) => boolean;
  denyAccessRequest: (requestId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    initData();
    try {
      if (!localStorage.getItem(USERS_STORAGE_KEY)) {
        const defaultUsers: StoredUser[] = [
          { name: 'admin01', password_plaintext: 'admin01', role: 'SUPER_ADMIN', status: 'ACTIVE' },
          { name: 'Quemoel', password_plaintext: 'quemoel01', role: 'SUPER_ADMIN', status: 'ACTIVE' },
          { name: IMMUTABLE_ADMIN, password_plaintext: 'quemoel01', role: 'SUPER_ADMIN', status: 'ACTIVE' },
        ];
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
      }
    } catch (error) {
      console.error("Failed to initialize user data in localStorage:", error);
    }

    try {
      const storedSessionJSON = localStorage.getItem(SESSION_KEY);
      if (storedSessionJSON) {
        const storedSession: StoredSession = JSON.parse(storedSessionJSON);
        const isExpired = (Date.now() - storedSession.loginTimestamp) > SESSION_EXPIRATION_MS;

        if (isExpired) {
          localStorage.removeItem(SESSION_KEY);
          setUser(null);
        } else {
          setUser(storedSession.user);
        }
      }
    } catch (error) {
      console.error("Failed to parse session data:", error);
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);


  const getUsers = useCallback((): StoredUser[] => {
    try {
      const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
      if (!usersJson) {
        return [];
      }
      const users: StoredUser[] = JSON.parse(usersJson);
      return users.map(u => ({
          ...u,
          role: u.role || 'EDITOR', 
          status: u.status || 'ACTIVE'
      }));
    } catch (error) {
      console.error("Failed to parse user data from localStorage:", error);
      return [];
    }
  }, []);

  const saveUsers = (users: StoredUser[]) => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  };
  
  const getPendingPasswordRequests = useCallback((): PasswordResetRequest[] => {
    try {
      const requestsJson = localStorage.getItem(PASSWORD_REQUESTS_KEY);
      return requestsJson ? JSON.parse(requestsJson) : [];
    } catch (error) {
      console.error("Failed to parse password requests from localStorage:", error);
      return [];
    }
  }, []);

  const savePasswordRequests = (requests: PasswordResetRequest[]) => {
    localStorage.setItem(PASSWORD_REQUESTS_KEY, JSON.stringify(requests));
  };

  const getAccessRequests = useCallback((): AccessRequest[] => {
    try {
      const requestsJson = localStorage.getItem(ACCESS_REQUESTS_KEY);
      return requestsJson ? JSON.parse(requestsJson) : [];
    } catch (error) {
      console.error("Failed to parse access requests from localStorage:", error);
      return [];
    }
  }, []);

  const saveAccessRequests = (requests: AccessRequest[]) => {
    localStorage.setItem(ACCESS_REQUESTS_KEY, JSON.stringify(requests));
  };

  const login = useCallback((name: string, pass: string): boolean => {
    const users = getUsers();
    const foundUser = users.find(u => u.name.toLowerCase() === name.toLowerCase() && u.password_plaintext === pass);
    
    if (foundUser) {
      if (foundUser.status === 'BLOCKED') {
        toast({ title: "Acesso Bloqueado", description: "Este usuário está bloqueado. Contate um administrador.", variant: "destructive" });
        return false;
      }
      const authUser: AuthUser = { name: foundUser.name, role: foundUser.role };
       const sessionData: StoredSession = {
          user: authUser,
          loginTimestamp: Date.now(),
      };
      setUser(authUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      toast({ title: `Bem-vindo, ${foundUser.name}!`, description: "Login realizado com sucesso." });
      logActivity(foundUser.name, 'LOGIN', 'Usuário realizou login.');
      return true;
    }
    
    toast({ title: "Erro de Login", description: "Nome de usuário ou senha incorretos.", variant: "destructive" });
    return false;
  }, [getUsers, toast]);

  const logout = useCallback(() => {
    if (user) {
      logActivity(user.name, 'LOGOUT', 'Usuário realizou logout.');
    }
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    toast({ title: "Logout realizado com sucesso." });
  }, [user, toast]);

  const registerUser = useCallback((name: string, pass: string, role: UserRole = 'EDITOR'): boolean => {
    const users = getUsers();
    if (users.find(u => u.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Erro no Cadastro", description: "Este nome de usuário já existe.", variant: "destructive" });
      return false;
    }
    
    const newUser: StoredUser = { name, password_plaintext: pass, role, status: 'ACTIVE' };
    saveUsers([...users, newUser]);
    logActivity(user?.name || 'SUPER_ADMIN', 'CREATE', `Criou o usuário ${name} com a permissão ${role}.`);
    return true;
  }, [getUsers, toast, user]);

  const updateUser = useCallback((name: string, updates: Partial<Pick<StoredUser, 'role' | 'status'>>): boolean => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.name === name);
    if (userIndex === -1) {
        toast({ title: "Erro", description: "Usuário não encontrado.", variant: "destructive" });
        return false;
    }
    
    const userToUpdate = users[userIndex];

    if (userToUpdate.name === IMMUTABLE_ADMIN) {
      toast({ title: 'Ação não permitida', description: 'Este administrador não pode ser alterado.', variant: 'destructive' });
      return false;
    }

    if (userToUpdate.role === 'SUPER_ADMIN' && user?.name !== IMMUTABLE_ADMIN) {
      toast({ title: 'Ação não permitida', description: 'Apenas o administrador principal pode alterar outros administradores.', variant: 'destructive' });
      return false;
    }
    
    users[userIndex] = { ...users[userIndex], ...updates };
    saveUsers(users);
    toast({ title: "Sucesso", description: `Usuário ${name} foi atualizado.` });
    logActivity(user?.name || 'SUPER_ADMIN', 'UPDATE', `Atualizou o usuário ${name}.`);
    return true;
  }, [getUsers, toast, user]);

  const deleteUser = useCallback((name: string): boolean => {
    let users = getUsers();
    const userToDelete = users.find(u => u.name === name);
    if (!userToDelete) {
      toast({ title: "Erro", description: "Usuário não encontrado.", variant: "destructive" });
      return false;
    }
    
    if (userToDelete.name === IMMUTABLE_ADMIN) {
      toast({ title: 'Ação não permitida', description: 'Este administrador não pode ser removido.', variant: 'destructive' });
      return false;
    }

    if (userToDelete.role === 'SUPER_ADMIN' && user?.name !== IMMUTABLE_ADMIN) {
      toast({ title: 'Ação não permitida', description: 'Apenas o administrador principal pode remover outros administradores.', variant: 'destructive' });
      return false;
    }
    
    users = users.filter(u => u.name !== name);
    saveUsers(users);
    toast({ title: "Sucesso", description: `Usuário ${name} foi removido.` });
    logActivity(user?.name || 'SUPER_ADMIN', 'DELETE', `Removeu o usuário ${name}.`);
    return true;
  }, [getUsers, toast, user]);
  
  const requestPasswordReset = useCallback((name: string, newPass: string): boolean => {
    const users = getUsers();
    const userExists = users.some(u => u.name.toLowerCase() === name.toLowerCase());
    if (!userExists) {
        toast({ title: "Usuário não encontrado", description: "Verifique o nome de usuário e tente novamente.", variant: "destructive" });
        return false;
    }

    let requests = getPendingPasswordRequests();
    requests = requests.filter(r => r.username.toLowerCase() !== name.toLowerCase());
    
    const newRequest: PasswordResetRequest = {
        username: name,
        newPassword_plaintext: newPass,
        requestedAt: Date.now(),
    };

    savePasswordRequests([...requests, newRequest]);
    toast({ title: "Solicitação Enviada", description: "Sua solicitação de redefinição de senha foi enviada para um administrador." });
    return true;
  }, [getUsers, getPendingPasswordRequests, toast]);

  const approvePasswordReset = useCallback((name: string): boolean => {
    let users = getUsers();
    let requests = getPendingPasswordRequests();

    const request = requests.find(r => r.username === name);
    if (!request) {
        toast({ title: "Erro", description: "Solicitação de redefinição não encontrada.", variant: "destructive" });
        return false;
    }

    const userIndex = users.findIndex(u => u.name === name);
    if (userIndex === -1) {
        toast({ title: "Erro", description: "Usuário não encontrado para atualizar.", variant: "destructive" });
        return false;
    }

    users[userIndex].password_plaintext = request.newPassword_plaintext;
    saveUsers(users);

    requests = requests.filter(r => r.username !== name);
    savePasswordRequests(requests);

    toast({ title: "Senha Atualizada", description: `A senha do usuário ${name} foi redefinida com sucesso.` });
    logActivity(user?.name || 'SUPER_ADMIN', 'UPDATE', `Aprovou redefinição de senha para ${name}.`);
    return true;
  }, [getUsers, getPendingPasswordRequests, toast, user]);

  const denyPasswordReset = useCallback((name: string): boolean => {
    let requests = getPendingPasswordRequests();
    if (!requests.some(r => r.username === name)) {
        return false;
    }
    
    requests = requests.filter(r => r.username !== name);
    savePasswordRequests(requests);

    toast({ title: "Solicitação Negada", description: `A solicitação de redefinição de senha para ${name} foi negada.` });
    logActivity(user?.name || 'SUPER_ADMIN', 'UPDATE', `Negou redefinição de senha para ${name}.`);
    return true;
  }, [getPendingPasswordRequests, toast, user]);

  const requestAccess = useCallback((data: Omit<AccessRequest, 'id' | 'requestedAt' | 'status'>): boolean => {
    const allUsers = getUsers();
    const allRequests = getAccessRequests();

    const firstName = data.fullName.split(' ')[0];
    if (!firstName) {
        toast({ title: "Nome Inválido", description: "Por favor, insira um nome completo válido.", variant: "destructive" });
        return false;
    }
    let potentialUsername: string;
    if (data.managerName) {
        potentialUsername = firstName.toLowerCase();
    } else if (data.npNumber) {
        potentialUsername = (firstName + data.npNumber).toLowerCase();
    } else {
        toast({ title: "Dados Incompletos", description: "É necessário fornecer NP ou nome do gestor.", variant: "destructive" });
        return false;
    }

    const userExists = allUsers.some(u => u.name.toLowerCase() === potentialUsername);
    if (userExists) {
        toast({ title: "Usuário Já Cadastrado", description: "Já existe um usuário ativo com estas informações. Tente fazer login ou redefinir sua senha.", variant: "destructive" });
        return false;
    }
    
    const requestExists = allRequests.some(req => {
        if (req.status === 'DENIED') {
            return false;
        }
        
        const reqFirstName = req.fullName.split(' ')[0];
        let existingRequestUsername: string;

        if (req.managerName) {
            existingRequestUsername = reqFirstName.toLowerCase();
        } else if (req.npNumber) {
            existingRequestUsername = (reqFirstName + req.npNumber).toLowerCase();
        } else {
            return false;
        }
        
        return existingRequestUsername === potentialUsername;
    });

    if (requestExists) {
        toast({ title: "Solicitação Duplicada", description: "Já existe uma solicitação pendente ou aprovada para este usuário.", variant: "destructive" });
        return false;
    }

    const newRequest: AccessRequest = {
        ...data,
        id: Date.now().toString(),
        requestedAt: Date.now(),
        status: 'PENDING',
    };
    saveAccessRequests([newRequest, ...allRequests]);
    toast({ title: "Solicitação Enviada", description: "Sua solicitação de acesso foi enviada para um administrador." });
    return true;
  }, [getUsers, getAccessRequests, toast]);

  const approveAccessRequest = useCallback((requestId: string, role: UserRole): boolean => {
    let requests = getAccessRequests();
    const requestIndex = requests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) {
      toast({ title: "Erro", description: "Solicitação não encontrada.", variant: "destructive" });
      return false;
    }
    
    const request = requests[requestIndex];

    const firstName = request.fullName.split(' ')[0] || `user${request.id}`;
    let username: string;
    let password: string;

    if (request.managerName) {
      username = firstName.toLowerCase();
      password = `${firstName.toLowerCase()}123`;
    } else if (request.npNumber) {
      username = (firstName + request.npNumber).toLowerCase();
      password = request.npNumber.toLowerCase();
    } else {
      toast({ title: "Dados Inválidos", description: "A solicitação não contém NP ou nome de gestor para criar as credenciais.", variant: "destructive" });
      return false;
    }
    
    const success = registerUser(username, password, role);

    if (success) {
      requests[requestIndex] = {
        ...request,
        status: 'APPROVED',
        generatedUsername: username,
        generatedPassword: password,
        assignedRole: role,
      };
      saveAccessRequests(requests);
      toast({ title: "Acesso Aprovado!", description: `Usuário ${username} foi criado com a permissão ${role}.` });
      logActivity(user?.name || 'SUPER_ADMIN', 'CREATE', `Aprovou acesso e criou o usuário ${username}.`);
      return true;
    } else {
      // registerUser already showed a toast "Este nome de usuário já existe."
      return false;
    }
  }, [getAccessRequests, registerUser, toast, user]);

  const denyAccessRequest = useCallback((requestId: string): boolean => {
    let requests = getAccessRequests();
    const requestIndex = requests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) {
        return false;
    }
    
    requests[requestIndex].status = 'DENIED';
    saveAccessRequests(requests);

    toast({ title: "Solicitação Negada", description: `A solicitação de acesso de ${requests[requestIndex].fullName} foi negada.` });
    logActivity(user?.name || 'SUPER_ADMIN', 'DELETE', `Negou a solicitação de acesso de ${requests[requestIndex].fullName}.`);
    return true;
  }, [getAccessRequests, toast, user]);


  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, registerUser, updateUser, deleteUser, getUsers, requestPasswordReset, getPendingPasswordRequests, approvePasswordReset, denyPasswordReset, requestAccess, getAccessRequests, approveAccessRequest, denyAccessRequest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
