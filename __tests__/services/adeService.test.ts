// Unit tests for adeService
// Tests all ADE API methods

import axios from 'axios';

// Mock axios
jest.mock('axios', () => {
  const mockInstance = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return {
    create: jest.fn(() => mockInstance),
    __mockInstance: mockInstance,
  };
});

// We need to get the mock instance BEFORE importing the service
const mockAxios = (axios as any).__mockInstance;

import { adeService } from '../../services/adeService';

describe('adeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('posts CAS credentials', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: {} });
      await adeService.login('user', 'pass');
      expect(mockAxios.post).toHaveBeenCalledWith('/ade/login', {
        cas_username: 'user',
        cas_password: 'pass',
      });
    });
  });

  describe('setIcalUrl', () => {
    it('posts ical URL', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: {} });
      await adeService.setIcalUrl('https://example.com/ical');
      expect(mockAxios.post).toHaveBeenCalledWith('/ade/ical-url', { ical_url: 'https://example.com/ical' });
    });
  });

  describe('loginWithCookies', () => {
    it('returns auth status', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { status: 'ok', authenticated: true } });
      const result = await adeService.loginWithCookies({ session: 'abc' });
      expect(result).toEqual({ status: 'ok', authenticated: true });
    });
  });

  describe('getStatus', () => {
    it('returns status object', async () => {
      const status = { authenticated: true, has_credentials: true, project_id: 1, resources_count: 5 };
      mockAxios.get.mockResolvedValueOnce({ data: status });
      const result = await adeService.getStatus();
      expect(result).toEqual(status);
    });
  });

  describe('getSchedule', () => {
    it('calls with default weeks', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { events: [], ical_url: null } });
      await adeService.getSchedule();
      expect(mockAxios.get).toHaveBeenCalledWith('/ade/schedule', { params: { weeks: 4 } });
    });

    it('includes resource_ids when provided', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { events: [], ical_url: null } });
      await adeService.getSchedule(2, [10, 20]);
      expect(mockAxios.get).toHaveBeenCalledWith('/ade/schedule', { params: { weeks: 2, resource_ids: '10,20' } });
    });
  });

  describe('search', () => {
    it('returns results array', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { results: [{ name: 'L3 Info' }] } });
      const result = await adeService.search('L3');
      expect(result).toEqual([{ name: 'L3 Info' }]);
    });

    it('returns empty array when no results', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: {} });
      const result = await adeService.search('xyz');
      expect(result).toEqual([]);
    });
  });

  describe('getProjects', () => {
    it('returns projects array', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { projects: [{ id: 1 }] } });
      const result = await adeService.getProjects();
      expect(result).toEqual([{ id: 1 }]);
    });

    it('returns empty when no projects key', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: {} });
      const result = await adeService.getProjects();
      expect(result).toEqual([]);
    });
  });

  describe('setProject', () => {
    it('posts to correct URL', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: {} });
      await adeService.setProject(42);
      expect(mockAxios.post).toHaveBeenCalledWith('/ade/project/42');
    });
  });

  describe('remember', () => {
    it('posts resource details', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: {} });
      await adeService.remember('Salle A', 100, 1);
      expect(mockAxios.post).toHaveBeenCalledWith('/ade/remember', {
        name: 'Salle A',
        resource_id: 100,
        project_id: 1,
      });
    });
  });

  describe('getResources', () => {
    it('returns resources array', async () => {
      const resources = [{ name: 'Room', resource_id: 1, project_id: 1 }];
      mockAxios.get.mockResolvedValueOnce({ data: resources });
      const result = await adeService.getResources();
      expect(result).toEqual(resources);
    });
  });

  describe('removeResource', () => {
    it('deletes with encoded name', async () => {
      mockAxios.delete.mockResolvedValueOnce({ data: {} });
      await adeService.removeResource('Salle A&B');
      expect(mockAxios.delete).toHaveBeenCalledWith('/ade/resources/Salle%20A%26B');
    });
  });

  describe('getIcalUrl', () => {
    it('returns ical_url', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { ical_url: 'https://ade.example.com/ical' } });
      const result = await adeService.getIcalUrl([1, 2], 2);
      expect(result).toBe('https://ade.example.com/ical');
      expect(mockAxios.get).toHaveBeenCalledWith('/ade/ical', { params: { weeks: 2, resource_ids: '1,2' } });
    });

    it('calls without resource_ids when not provided', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { ical_url: 'url' } });
      await adeService.getIcalUrl();
      expect(mockAxios.get).toHaveBeenCalledWith('/ade/ical', { params: { weeks: 4 } });
    });
  });

  describe('addRoutine', () => {
    it('posts routine data', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: {} });
      await adeService.addRoutine('daily', '0 8 * * *', 'browse', { node: 'test' });
      expect(mockAxios.post).toHaveBeenCalledWith('/ade/routines', {
        name: 'daily',
        cron: '0 8 * * *',
        action: 'browse',
        params: { node: 'test' },
      });
    });

    it('defaults params to empty object', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: {} });
      await adeService.addRoutine('test', '* * * * *', 'status');
      expect(mockAxios.post).toHaveBeenCalledWith('/ade/routines', {
        name: 'test',
        cron: '* * * * *',
        action: 'status',
        params: {},
      });
    });
  });

  describe('getRoutines', () => {
    it('returns routines array', async () => {
      const routines = [{ name: 'daily', cron: '0 8 * * *', action: 'browse', params: {} }];
      mockAxios.get.mockResolvedValueOnce({ data: routines });
      const result = await adeService.getRoutines();
      expect(result).toEqual(routines);
    });
  });

  describe('removeRoutine', () => {
    it('deletes with encoded name', async () => {
      mockAxios.delete.mockResolvedValueOnce({ data: {} });
      await adeService.removeRoutine('my routine');
      expect(mockAxios.delete).toHaveBeenCalledWith('/ade/routines/my%20routine');
    });
  });

  describe('adeAction', () => {
    it('posts action with params and 120s timeout', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { result: 'ok' } });
      const result = await adeService.adeAction('browse', { node: 'L3' });
      expect(mockAxios.post).toHaveBeenCalledWith('/ade/action', { action: 'browse', params: { node: 'L3' } }, { timeout: 120000 });
      expect(result).toEqual({ result: 'ok' });
    });

    it('defaults params to empty', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: {} });
      await adeService.adeAction('status');
      expect(mockAxios.post).toHaveBeenCalledWith('/ade/action', { action: 'status', params: {} }, { timeout: 120000 });
    });
  });
});
