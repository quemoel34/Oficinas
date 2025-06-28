'use client';

import NewVisitForm from '@/components/tabs/new-visit-form';
import VisitsList from '@/components/tabs/visits-list';
import FleetsList from './tabs/fleets-list';
import TimeMonitor from './tabs/time-monitor';
import EditVisitForm from './tabs/edit-visit-form';
import FleetHistory from './tabs/fleet-history';
import { useState, useEffect, useCallback } from 'react';
import { type Fleet, type Visit, type AuthUser } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { 
    addVisit as addVisitToStorage, 
    updateVisit as updateVisitInStorage, 
    deleteVisit as deleteVisitFromStorage,
    getVisits, 
    getFleets, 
    addFleet as addFleetToStorage,
    deleteFleet as deleteFleetFromStorage
} from '@/lib/data-manager';
import { logActivity } from '@/lib/activity-logger';

interface DashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Dashboard({ activeTab, onTabChange }: DashboardProps) {
  const { user } = useAuth();
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [viewingHistoryFor, setViewingHistoryFor] = useState<Fleet | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const refreshData = useCallback(() => {
    setVisits(getVisits());
    setFleets(getFleets());
  }, []);
  
  useEffect(() => {
    refreshData();
  }, [dataVersion, refreshData]);

  const handleAddVisit = (newVisitData: Omit<Visit, 'id' | 'equipmentType' | 'createdBy' | 'createdAt'> & { carrier: string }, currentUser: AuthUser) => {
    const existingFleet = getFleets().find(f => f.id === newVisitData.fleetId);
    let equipmentType = existingFleet?.equipmentType;

    if (!existingFleet) {
        const newFleet: Fleet = {
            id: newVisitData.fleetId,
            plate: newVisitData.plate,
            carrier: newVisitData.carrier,
            equipmentType: 'Não especificado',
        };
        addFleetToStorage(newFleet);
        equipmentType = newFleet.equipmentType;
    }
    
    const visitToAdd = {
        ...newVisitData,
        equipmentType: equipmentType || 'Não especificado',
    };
    
    addVisitToStorage(visitToAdd, currentUser);
    logActivity(currentUser.name, 'CREATE', `Criou a visita para a frota ${visitToAdd.fleetId}`);
    setDataVersion(v => v + 1);
  };

  const handleStartEdit = (visit: Visit) => {
    setEditingVisit(visit);
    onTabChange('edit-visit');
  };

  const handleCancelEdit = () => {
    setEditingVisit(null);
    onTabChange('visits');
  };

  const handleUpdateVisit = (updatedVisit: Visit, currentUser: AuthUser) => {
    updateVisitInStorage(updatedVisit, currentUser);
    logActivity(currentUser.name, 'UPDATE', `Atualizou a visita ${updatedVisit.id} para o status ${updatedVisit.status}`);
    setEditingVisit(null);
    onTabChange('visits');
    setDataVersion(v => v + 1);
  };
  
  const handleViewHistory = (fleet: Fleet) => {
    setViewingHistoryFor(fleet);
  };
  
  const handleDeleteVisit = (visitId: string, visitFleetId: string) => {
      if (!user) return;
      deleteVisitFromStorage(visitId);
      logActivity(user.name, 'DELETE', `Excluiu a visita ${visitId} da frota ${visitFleetId}.`);
      setDataVersion(v => v + 1);
  };

  const handleDeleteFleet = (fleetId: string) => {
    if (!user) return { success: false, hasVisits: false };
    
    const result = deleteFleetFromStorage(fleetId);

    if (result.success) {
      logActivity(user.name, 'DELETE', `Excluiu a frota ${fleetId}.`);
      setDataVersion(v => v + 1);
    }
    
    return result;
  };

  const onAddVisitSubmit = (visitData: Omit<Visit, 'id' | 'equipmentType' | 'createdBy' | 'createdAt'> & { carrier: string }) => {
      if (!user) return;
      handleAddVisit(visitData, user);
      onTabChange('visits'); // Switch to visits list after adding
  }

  const onUpdateVisitSubmit = (visitData: Visit) => {
      if (!user) return;
      handleUpdateVisit(visitData, user);
  }

  useEffect(() => {
    if (activeTab !== 'fleets') {
      setViewingHistoryFor(null);
    }
    if (activeTab !== 'edit-visit' && editingVisit) {
      setEditingVisit(null);
    }
  }, [activeTab, editingVisit]);

  const renderContent = () => {
    if (activeTab === 'edit-visit' && editingVisit) {
      return (
        <EditVisitForm 
          visit={editingVisit} 
          onUpdateVisit={onUpdateVisitSubmit} 
          onCancel={handleCancelEdit} 
        />
      );
    }

    switch (activeTab) {
      case 'monitor':
        return <TimeMonitor visits={visits} fleets={fleets} />;
      case 'new-visit':
        return <NewVisitForm onAddVisit={onAddVisitSubmit} />;
      case 'visits':
        return <VisitsList visits={visits} onEditVisit={handleStartEdit} onDeleteVisit={handleDeleteVisit} />;
      case 'fleets':
        return viewingHistoryFor ? (
          <FleetHistory
            fleet={viewingHistoryFor}
            visits={visits.filter(v => v.fleetId === viewingHistoryFor.id)}
            onBack={() => setViewingHistoryFor(null)}
            onEditVisit={handleStartEdit}
          />
        ) : (
          <FleetsList
            fleets={fleets}
            visits={visits}
            onViewHistory={handleViewHistory}
            onDeleteFleet={handleDeleteFleet}
          />
        );
      default:
        return <TimeMonitor visits={visits} fleets={fleets} />;
    }
  };

  return <div className="w-full h-full">{renderContent()}</div>;
}
