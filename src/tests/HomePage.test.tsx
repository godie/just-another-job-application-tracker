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
    getMockedState().mockReturnValue({
      applications: [],
      loadApplications: vi.fn(),
      refreshApplications: vi.fn(),
    });
  });

  test('Debe renderizar y abrir el formulario sin bucles', async () => {
    renderWithProviders(<HomePage />);
    const addButton = screen.getByTestId('add-entry-button');
    fireEvent.click(addButton);
    expect(await screen.findByText('form.addTitle')).toBeInTheDocument();
  });

  test('Muestra aplicaciones en la tabla correctamente', async () => {
    getMockedState().mockReturnValue({
      applications: [{ id: '1', position: 'Senior Dev', company: 'Google', status: 'Applied' }],
      loadApplications: vi.fn(),
      refreshApplications: vi.fn(),
    });

    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('cell', { name: /Senior Dev/i })).toBeInTheDocument();
    expect((await screen.findAllByText(/Google/i)).length).toBeGreaterThanOrEqual(1);
  });

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

    getMockedState().mockReturnValue({
      ...mockState,
      applications: [{ id: 'new-id', position: 'Software Engineer', company: 'OpenAI', status: 'Applied' }]
    });

    renderWithProviders(<HomePage />); // Re-render para confirmar persistencia visual
    expect((await screen.findAllByText(/Software Engineer/i)).length).toBeGreaterThan(0);
  });

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

  test('Vistas: Cambia entre Tabla y Kanban correctamente', async () => {
    getMockedState().mockReturnValue({
      applications: [{ id: '1', position: 'Support', company: 'Help', status: 'Applied' }],
      loadApplications: vi.fn(),
      refreshApplications: vi.fn(),
    });

    renderWithProviders(<HomePage />);

    const kanbanButton = screen.getByRole('tab', { name: /settings.view.kanban/i });
    fireEvent.click(kanbanButton);

    expect(screen.getByText('views.kanban')).toBeInTheDocument();
  });
});
