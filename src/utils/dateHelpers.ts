
export const getCurrentISOString = () => new Date().toISOString();

export const getCurrentDateKey = () => new Date().toISOString().split('T')[0];

export const getCurrentYear = () => new Date().getFullYear();

export const getCurrentLocaleString = (dateString: string) => new Date(dateString).toLocaleString();

export const getTodayDate = () => new Date();

export const getLocalDateString = () => new Date().toLocaleDateString('en-CA');

export const cloneDate = (date: Date) => new Date(date);

export const parseDateString = (dateString: string) => new Date(dateString);

export const getLocaleDateString = (dateString: string) => new Date(dateString).toLocaleDateString();
