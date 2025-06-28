import * as XLSX from 'xlsx';
import { type Visit } from './types';
import { format } from 'date-fns';

const formatDate = (timestamp?: number) => {
    return timestamp ? format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss') : '';
};

export const exportVisitsToExcel = (visits: Visit[]) => {
  if (visits.length === 0) {
    alert('Não há visitas para exportar com os filtros selecionados.');
    return;
  }
  
  const flattenedData = visits.map(v => ({
    'ID': v.id,
    'Frota ID': v.fleetId,
    'Placa': v.plate,
    'Tipo Equipamento': v.equipmentType,
    'Tipo Ordem': Array.isArray(v.orderType) ? v.orderType.join(', ') : v.orderType,
    'Status': v.status,
    'Data Chegada': formatDate(v.arrivalTimestamp),
    'Início Manutenção': formatDate(v.maintenanceStartTimestamp),
    'Aguardando Peça': formatDate(v.awaitingPartTimestamp),
    'Data Finalização': formatDate(v.finishTimestamp),
    'Box': v.boxNumber || '',
    'Entrada Box': formatDate(v.boxEntryTimestamp),
    'Oficina': v.workshop || '',
    'Observações': v.notes || '',
    'Serviço Realizado': v.servicePerformed || '',
    'Peça Utilizada': v.partUsed || '',
    'Quantidade Peça': v.partQuantity?.toString() || '',
    'Criado Por': v.createdBy || '',
    'Criado Em': formatDate(v.createdAt),
    'Atualizado Por': v.updatedBy || '',
    'Atualizado Em': formatDate(v.updatedAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(flattenedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Visitas');

  // Adjust column widths
  const colWidths = Object.keys(flattenedData[0]).map(key => ({ wch: Math.max(key.length, ...flattenedData.map(row => String((row as any)[key]).length)) + 2 }));
  worksheet['!cols'] = colWidths;

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `carretometro_visitas_${date}.xlsx`);
};
