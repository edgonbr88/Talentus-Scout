import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { AdminClubsComponent } from './admin-clubs.component';
import { AdminClubService } from '../../../core/services/admin-club.service';
import { AdminClub, AdminClubPage, ClubStats } from '../../../core/models/admin-club.model';

describe('AdminClubsComponent (TS-60) - Mantenedor de Clubes y Organizaciones', () => {
  let component: AdminClubsComponent;
  let fixture: ComponentFixture<AdminClubsComponent>;
  let adminClubServiceSpy: jasmine.SpyObj<AdminClubService>;

  const mockClub1: AdminClub = {
    id: 'club-uuid-1',
    name: 'Caracas Fútbol Club',
    federationCode: 'FVF-001',
    city: 'Caracas',
    state: 'Distrito Capital',
    country: 'Venezuela',
    logoUrl: '/uploads/clubs/caracas.png',
    verifiedOfficial: true,
    createdAt: new Date().toISOString(),
    athletesCount: 12,
    scoutsCount: 3
  };

  const mockClub2: AdminClub = {
    id: 'club-uuid-2',
    name: 'Academia Los Samanes',
    federationCode: null,
    city: 'Maracay',
    state: 'Aragua',
    country: 'Venezuela',
    logoUrl: null,
    verifiedOfficial: false,
    createdAt: new Date().toISOString(),
    athletesCount: 4,
    scoutsCount: 1
  };

  const mockPage: AdminClubPage = {
    content: [mockClub1, mockClub2],
    totalElements: 2,
    totalPages: 1,
    size: 20,
    number: 0
  };

  const mockStats: ClubStats = {
    totalClubs: 2,
    verifiedClubs: 1,
    pendingClubs: 1,
    totalAffiliatedAthletes: 16
  };

  beforeEach(async () => {
    adminClubServiceSpy = jasmine.createSpyObj('AdminClubService', [
      'getClubs',
      'getStats',
      'getClub',
      'createClub',
      'updateClub',
      'toggleVerification',
      'uploadLogo',
      'deleteClub'
    ]);

    adminClubServiceSpy.getStats.and.returnValue(of(mockStats));
    adminClubServiceSpy.getClubs.and.returnValue(of(mockPage));

    await TestBed.configureTestingModule({
      imports: [AdminClubsComponent],
      providers: [
        { provide: AdminClubService, useValue: adminClubServiceSpy },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminClubsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe instanciarse correctamente y cargar estadísticas y lista de clubes', () => {
    expect(component).toBeTruthy();
    expect(adminClubServiceSpy.getStats).toHaveBeenCalled();
    expect(adminClubServiceSpy.getClubs).toHaveBeenCalledWith('', 'ALL', 0, 20);
    expect(component.clubs().length).toBe(2);
    expect(component.stats().totalClubs).toBe(2);
    expect(component.stats().verifiedClubs).toBe(1);
    expect(component.stats().pendingClubs).toBe(1);
  });

  it('debe alternar la verificación oficial en un clic', () => {
    const updatedClub: AdminClub = { ...mockClub2, verifiedOfficial: true };
    adminClubServiceSpy.toggleVerification.and.returnValue(of(updatedClub));

    component.toggleVerification(mockClub2);

    expect(adminClubServiceSpy.toggleVerification).toHaveBeenCalledWith(mockClub2.id, true);
    expect(component.feedback()?.type).toBe('success');
    expect(component.feedback()?.text).toContain('verificado como oficial');
  });

  it('debe filtrar por estado al seleccionar una píldora (pill)', () => {
    component.setFilter('VERIFIED');

    expect(component.currentFilter()).toBe('VERIFIED');
    expect(adminClubServiceSpy.getClubs).toHaveBeenCalledWith('', 'VERIFIED', 0, 20);
  });

  it('debe buscar clubes en tiempo real al escribir en el buscador', () => {
    component.searchQuery = 'Caracas';
    component.onSearchChange();

    expect(adminClubServiceSpy.getClubs).toHaveBeenCalledWith('Caracas', 'ALL', 0, 20);
  });

  it('debe abrir y cerrar el modal de creación y edición', () => {
    component.openCreateModal();
    expect(component.isEditModalOpen()).toBeTrue();
    expect(component.editingClub()).toBeNull();
    expect(component.formVerifiedOfficial).toBeTrue();

    component.openEditModal(mockClub1);
    expect(component.isEditModalOpen()).toBeTrue();
    expect(component.editingClub()?.name).toBe('Caracas Fútbol Club');
    expect(component.formCity).toBe('Caracas');

    component.closeEditModal();
    expect(component.isEditModalOpen()).toBeFalse();
  });

  it('debe abrir modal de confirmación de eliminación y ejecutar baja segura con política de integridad', () => {
    adminClubServiceSpy.deleteClub.and.returnValue(of(undefined));

    component.openDeleteModal(mockClub1);
    expect(component.isDeleteModalOpen()).toBeTrue();
    expect(component.clubToDelete()?.id).toBe(mockClub1.id);

    component.confirmDelete();

    expect(adminClubServiceSpy.deleteClub).toHaveBeenCalledWith(mockClub1.id);
    expect(component.isDeleteModalOpen()).toBeFalse();
    expect(component.feedback()?.type).toBe('success');
    expect(component.feedback()?.text).toContain('atletas asociados pasaron a independientes');
  });
});
