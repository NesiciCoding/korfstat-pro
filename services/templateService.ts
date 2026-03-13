import { MatchTemplate } from '../types';

export const TemplateService = {
  async getAllTemplates(): Promise<MatchTemplate[]> {
    try {
      const response = await fetch('/api/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      return await response.json();
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  },

  async saveTemplate(template: MatchTemplate): Promise<boolean> {
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });
      return response.ok;
    } catch (error) {
      console.error('Error saving template:', error);
      return false;
    }
  },

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  }
};
