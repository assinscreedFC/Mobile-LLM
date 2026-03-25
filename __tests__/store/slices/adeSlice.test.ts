import { adeService } from '../../../services/adeService';

jest.mock('../../../services/adeService', () => ({
  adeService: {
    adeAction: jest.fn(),
    getStatus: jest.fn(),
  },
}));

import {
  parseADEParams,
  executeADECall,
  processADECalls,
  ADE_ALLOWED_ACTIONS,
  ADE_SYSTEM_PROMPT,
  ADE_MAX_ITERATIONS,
} from '../../../store/slices/adeSlice';

const mockAdeService = adeService as jest.Mocked<typeof adeService>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('adeSlice', () => {
  describe('constants', () => {
    it('ADE_SYSTEM_PROMPT is a non-empty string', () => {
      expect(typeof ADE_SYSTEM_PROMPT).toBe('string');
      expect(ADE_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });

    it('ADE_MAX_ITERATIONS is 5', () => {
      expect(ADE_MAX_ITERATIONS).toBe(5);
    });

    it('ADE_ALLOWED_ACTIONS contains expected actions', () => {
      expect(ADE_ALLOWED_ACTIONS.has('browse')).toBe(true);
      expect(ADE_ALLOWED_ACTIONS.has('expand')).toBe(true);
      expect(ADE_ALLOWED_ACTIONS.has('select')).toBe(true);
      expect(ADE_ALLOWED_ACTIONS.has('search')).toBe(true);
      expect(ADE_ALLOWED_ACTIONS.has('read')).toBe(true);
      expect(ADE_ALLOWED_ACTIONS.has('status')).toBe(true);
      expect(ADE_ALLOWED_ACTIONS.has('delete')).toBe(false);
    });
  });

  describe('parseADEParams', () => {
    it('returns empty object for empty string', () => {
      expect(parseADEParams('')).toEqual({});
    });

    it('returns empty object for whitespace-only string', () => {
      expect(parseADEParams('   ')).toEqual({});
    });

    it('parses a single param', () => {
      expect(parseADEParams('node=Formations')).toEqual({ node: 'Formations' });
    });

    it('parses multiple params', () => {
      expect(parseADEParams('query=L3 informatique,lang=fr')).toEqual({
        query: 'L3 informatique',
        lang: 'fr',
      });
    });

    it('trims whitespace around keys and values', () => {
      expect(parseADEParams(' key = value , other = test ')).toEqual({
        key: 'value',
        other: 'test',
      });
    });

    it('ignores parts without "="', () => {
      expect(parseADEParams('badparam,good=val')).toEqual({ good: 'val' });
    });
  });

  describe('executeADECall', () => {
    it('returns error message for disallowed action', async () => {
      const result = await executeADECall('delete', {});
      expect(result).toBe('[ADE] Action non autorisée: delete');
    });

    it('calls adeService.getStatus for "status" action', async () => {
      mockAdeService.getStatus.mockResolvedValue({
        authenticated: true,
        has_credentials: true,
        project_id: 42,
        resources_count: 5,
      });

      const result = await executeADECall('status', {});
      expect(result).toContain('Connecté: true');
      expect(result).toContain('Credentials: true');
      expect(result).toContain('Projet: 42');
      expect(result).toContain('Ressources: 5');
    });

    it('calls adeService.getStatus with null project_id', async () => {
      mockAdeService.getStatus.mockResolvedValue({
        authenticated: false,
        has_credentials: false,
        project_id: null,
        resources_count: 0,
      });

      const result = await executeADECall('status', {});
      expect(result).toContain('Projet: aucun');
    });

    it('calls adeService.adeAction for allowed non-status actions', async () => {
      mockAdeService.adeAction.mockResolvedValue({ nodes: ['Formations', 'Salles'] });

      const result = await executeADECall('browse', {});
      expect(mockAdeService.adeAction).toHaveBeenCalledWith('browse', {});
      expect(result).toContain('[ADE]');
      expect(result).toContain('Formations');
    });

    it('passes params to adeService.adeAction', async () => {
      mockAdeService.adeAction.mockResolvedValue({ results: [] });

      await executeADECall('search', { query: 'L3' });
      expect(mockAdeService.adeAction).toHaveBeenCalledWith('search', { query: 'L3' });
    });

    it('handles error with response data detail', async () => {
      mockAdeService.adeAction.mockRejectedValue({
        response: { data: { detail: 'Not connected' } },
      });

      const result = await executeADECall('browse', {});
      expect(result).toBe('[ADE] Erreur : Not connected');
    });

    it('handles error with message', async () => {
      mockAdeService.adeAction.mockRejectedValue(new Error('Network failure'));

      const result = await executeADECall('read', {});
      expect(result).toBe('[ADE] Erreur : Network failure');
    });

    it('handles error with no detail or message', async () => {
      mockAdeService.adeAction.mockRejectedValue({});

      const result = await executeADECall('read', {});
      expect(result).toBe('[ADE] Erreur : Erreur inconnue');
    });
  });

  describe('processADECalls', () => {
    it('returns hasADE false when no ADE tags present', async () => {
      const result = await processADECalls('Bonjour, comment ça va ?');
      expect(result.hasADE).toBe(false);
      expect(result.processed).toBe('Bonjour, comment ça va ?');
    });

    it('processes a single ADE tag', async () => {
      mockAdeService.adeAction.mockResolvedValue({ nodes: ['A'] });

      const result = await processADECalls('Voici: <<ADE:browse()>> fin');
      expect(result.hasADE).toBe(true);
      expect(result.processed).toContain('[ADE]');
      expect(result.processed).toContain('fin');
      expect(result.processed).not.toContain('<<ADE:');
    });

    it('processes multiple ADE tags', async () => {
      mockAdeService.adeAction
        .mockResolvedValueOnce({ results: ['L3 Info'] })
        .mockResolvedValueOnce({ events: [] });

      const text = '<<ADE:search(query=L3)>> then <<ADE:read()>>';
      const result = await processADECalls(text);

      expect(result.hasADE).toBe(true);
      expect(mockAdeService.adeAction).toHaveBeenCalledTimes(2);
      expect(result.processed).not.toContain('<<ADE:');
    });

    it('handles ADE tags with params', async () => {
      mockAdeService.adeAction.mockResolvedValue({ ok: true });

      const result = await processADECalls('<<ADE:expand(node=Formations)>>');
      expect(result.hasADE).toBe(true);
      expect(mockAdeService.adeAction).toHaveBeenCalledWith('expand', { node: 'Formations' });
    });

    it('handles disallowed actions within tags', async () => {
      const result = await processADECalls('<<ADE:delete(node=x)>>');
      expect(result.hasADE).toBe(true);
      expect(result.processed).toContain('Action non autorisée');
    });
  });
});
