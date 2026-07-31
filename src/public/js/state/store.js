// Global State Store

class Store {
  constructor() {
    this.state = {
      activeTab: 'dashboard',
      currentUser: {
        id: 'u_dev',
        name: 'Aaron',
        username: 'aaron_dev',
        role: 'DEV_STEALTH',
        public_role: 'OPERATIVE',
        tag: 'Creator'
      },
      tasksData: { official: [], marketplace: [] },
      teamsData: [],
      hallOfFameData: { allTime: [], season1: [], titles: [] }
    };
    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

export const store = new Store();
