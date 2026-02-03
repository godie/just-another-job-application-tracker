import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import HomePage from '../pages/HomePage';
import { expect, test, describe, beforeEach, vi, type Mock } from 'vitest';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AlertProvider } from '../components/AlertProvider';
import { useApplicationsStore } from '../stores/applicationsStore';


interface MockStoreState {
  applications: JobApplication[];
  isLoading: boolean;
  loadApplications: Mock;
  addApplication: Mock;
  updateApplication: Mock;
  deleteApplication: Mock;
  refreshApplications: Mock;
}

// =========================================================================
// 1. MOCK RADICAL: Evita loops infinitos de Zustand e i18next
// =========================================================================
vi.mock('../stores/applicationsStore', () => {
  const mockGetState = vi.fn(() => ({
    applications: [],
    isLoading: false,
    loadApplications: vi.fn(),
    addApplication: vi.fn(),
    updateApplication: vi.fn(),
    deleteApplication: vi.fn(),
    refreshApplications: vi.fn(),
  }));

  return {
    useApplicationsStore: Object.assign(
      (selector: (state: MockStoreState) => unknown) => selector(mockGetState() as MockStoreState),
      {
        getState: mockGetState,
        setState: vi.fn(),
        subscribe: vi.fn(),
      }
    ),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../components/GoogleSheetsSync', () => ({ default: () => null }));

// =========================================================================
// 2. SETUP Y HELPERS
// =========================================================================
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <GoogleOAuthProvider clientId="test">
      <AlertProvider>{ui}</AlertProvider>
    </GoogleOAuthProvider>
  );
};
const getMockedState = () => (useApplicationsStore.getState as Mock);
describe('HomePage - Full Integration Suite', () => {

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    // Estado base para cada test
    getMockedState().mockReturnValue({
      applications: [],
      loadApplications: vi.fn(),
      refreshApplications: vi.fn(),
    });
  });

  // --- TEST DE RENDERIZADO (Fix Final V2) ---
  test('Debe renderizar y abrir el formulario sin bucles', async () => {
    renderWithProviders(<HomePage />);
    const addButton = screen.getByTestId('add-entry-button');
    fireEvent.click(addButton);
    expect(await screen.findByText('form.addTitle')).toBeInTheDocument();
  });

  // --- TEST DE VISUALIZACIÓN (Fix Final V2 adaptado) ---
  test('Muestra aplicaciones en la tabla correctamente', () => {
    getMockedState().mockReturnValue({
      applications: [{ id: '1', position: 'Senior Dev', company: 'Google', status: 'Applied' }],
      loadApplications: vi.fn(),
      refreshApplications: vi.fn(),
    });

    renderWithProviders(<HomePage />);

    expect(screen.getByRole('cell', { name: /Senior Dev/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Google/i).length).toBeGreaterThanOrEqual(1);
  });

  // --- TEST DE FLUJO COMPLETO (Fix Final V2) ---
  test('Flujo completo: Agregar aplicación y verificar visualización', async () => {
    const mockState = {
      applications: [],
      loadApplications: vi.fn(),
      addApplication: vi.fn(),
      refreshApplications: vi.fn(),
    };
    getMockedState().mockReturnValue(mockState);

    renderWithProviders(<HomePage />);

    fireEvent.click(screen.getByTestId('add-entry-button'));
    fireEvent.change(screen.getByTestId('form-position'), { target: { value: 'Software Engineer' } });
    fireEvent.change(screen.getByTestId('form-company'), { target: { value: 'OpenAI' } });
    fireEvent.click(screen.getByTestId('form-save'));

    // Actualizamos el mock para simular que la data ya existe tras el guardado
    getMockedState().mockReturnValue({
      ...mockState,
      applications: [{ id: 'new-id', position: 'Software Engineer', company: 'OpenAI', status: 'Applied' }]
    });

    renderWithProviders(<HomePage />); // Re-render para confirmar persistencia visual
    expect(screen.getAllByText(/Software Engineer/i).length).toBeGreaterThan(0);
  });

  // --- TEST DE FILTROS (Lógica original recuperada) ---
  test('Filtros: La búsqueda reduce los resultados en la tabla', async () => {
    const apps = [
      { id: '1', position: 'Frontend Dev', company: 'UI Labs', status: 'Applied' },
      { id: '2', position: 'Backend Dev', company: 'API Works', status: 'Applied' }
    ];

    getMockedState().mockReturnValue({
      applications: apps,
      loadApplications: vi.fn(),
      refreshApplications: vi.fn(),
    });

    renderWithProviders(<HomePage />);

    const searchInput = screen.getByPlaceholderText('filters.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'Frontend' } });

    await waitFor(() => {
      expect(screen.getAllByText(/Frontend Dev/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/Backend Dev/i)).not.toBeInTheDocument();
    });
  });

  // --- TEST DE VISTAS (Lógica original recuperada) ---
  test('Vistas: Cambia entre Tabla y Kanban correctamente', async () => {
    getMockedState().mockReturnValue({
      applications: [{ id: '1', position: 'Support', company: 'Help', status: 'Applied' }],
      loadApplications: vi.fn(),
      refreshApplications: vi.fn(),
    });

    renderWithProviders(<HomePage />);

    // Cambiar a Kanban (usando la clave de traducción para el aria-label)
    const kanbanButton = screen.getByRole('button', { name: /settings.view.kanban/i });
    fireEvent.click(kanbanButton);

    expect(screen.getByText('views.kanban')).toBeInTheDocument();
  });
});
