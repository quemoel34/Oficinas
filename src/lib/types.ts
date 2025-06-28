export type Workshop = 'Monte Líbano' | 'Vale das Carretas' | 'CMC';
export type MaintenanceStatus = 'Em Fila' | 'Em Manutenção' | 'Aguardando Peça' | 'Finalizado' | 'Movimentação';
export type OrderType = 'Preventiva' | 'Corretiva' | 'Preditiva' | 'Calibragem' | 'Inspeção';
export type UserRole = 'SUPER_ADMIN' | 'EDITOR' | 'VIEWER';

export interface TirePressures {
  axle1Left?: number;
  axle1Right?: number;
  axle2Left?: number;
  axle2Right?: number;
}

export interface CalibrationData {
  trailer1?: TirePressures;
  trailer2?: TirePressures;
  trailer3?: TirePressures;
}

export interface ServiceLog {
  orderType: OrderType;
  servicePerformed?: string;
  partUsed?: string;
  partQuantity?: number;
  calibrationData?: CalibrationData;
  startTimestamp: number;
  finishTimestamp: number;
  workshop?: Workshop;
  boxNumber?: string;
}

export interface Visit {
  id: string;
  fleetId: string;
  plate: string;
  equipmentType: string;
  orderType: OrderType[];
  status: MaintenanceStatus;
  arrivalTimestamp: number;
  maintenanceStartTimestamp?: number;
  awaitingPartTimestamp?: number;
  finishTimestamp?: number;
  boxNumber?: string;
  boxEntryTimestamp?: number;
  imageUrl?: string;
  notes?: string;
  servicePerformed?: string;
  partUsed?: string;
  partQuantity?: number;
  workshop?: Workshop;
  createdBy?: string;
  createdAt?: number;
  updatedBy?: string;
  updatedAt?: number;
  calibrationData?: CalibrationData;
  serviceHistory?: ServiceLog[];
}

export interface Fleet {
  id: string;
  plate: string;
  equipmentType: string;
  carrier: string;
}

export interface Part {
    id: string;
    name: string;
    code: string;
}

export interface AuthUser {
  name: string;
  role: UserRole;
}

// NOTE: Storing plain text passwords is not secure. This is for prototyping only.
export interface StoredUser extends AuthUser {
  password_plaintext: string; 
  status: 'ACTIVE' | 'BLOCKED';
}

export interface PasswordResetRequest {
  username: string;
  newPassword_plaintext: string;
  requestedAt: number;
}

export interface AccessRequest {
  id: string;
  fullName: string;
  email?: string;
  npNumber?: string;
  workshop: Workshop | 'Outra';
  requestedAt: number;
  managerName?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  generatedUsername?: string;
  generatedPassword?: string;
  assignedRole?: UserRole;
}
