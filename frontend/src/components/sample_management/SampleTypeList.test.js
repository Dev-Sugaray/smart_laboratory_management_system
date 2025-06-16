import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import SampleTypeList from './SampleTypeList.vue';

// Mock router-link for components that use it, if not using shallowMount or global stubs
const RouterLinkStub = {
  name: 'RouterLink',
  template: '<a><slot></slot></a>',
  props: ['to']
};

describe('SampleTypeList.vue', () => {
  const mockSampleTypes = [
    { id: 1, name: 'Blood', description: 'Whole blood sample' },
    { id: 2, name: 'Plasma', description: 'Centrifuged plasma' },
  ];

  it('renders "Loading..." message when isLoading is true', () => {
    const wrapper = mount(SampleTypeList, {
      props: { isLoading: true, sampleTypes: [] },
      global: { stubs: { RouterLink: RouterLinkStub } } // Stub router-link if it's directly in this component
    });
    expect(wrapper.find('.loading-indicator').exists()).toBe(true);
    expect(wrapper.find('.loading-indicator').text()).toBe('Loading sample types...');
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('renders "No sample types found." message when list is empty and not loading', () => {
    const wrapper = mount(SampleTypeList, {
      props: { isLoading: false, sampleTypes: [] },
      global: { stubs: { RouterLink: RouterLinkStub } }
    });
    expect(wrapper.find('.no-data-message').exists()).toBe(true);
    expect(wrapper.find('.no-data-message').text()).toContain('No sample types found.');
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('renders the table with sample types data', () => {
    const wrapper = mount(SampleTypeList, {
      props: { isLoading: false, sampleTypes: mockSampleTypes },
      global: { stubs: { RouterLink: RouterLinkStub } }
    });
    expect(wrapper.find('table').exists()).toBe(true);
    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBe(mockSampleTypes.length);

    for (let i = 0; i < mockSampleTypes.length; i++) {
      const row = rows[i];
      const cells = row.findAll('td');
      expect(cells[0].text()).toBe(mockSampleTypes[i].name);
      expect(cells[1].text()).toBe(mockSampleTypes[i].description);
      expect(cells[2].find('button.is-info').exists()).toBe(true); // Edit button
      expect(cells[2].find('button.is-danger').exists()).toBe(true); // Delete button
    }
  });

  it('emits "edit-sample-type" with sample type object when Edit button is clicked', async () => {
    const wrapper = mount(SampleTypeList, {
      props: { isLoading: false, sampleTypes: mockSampleTypes },
      global: { stubs: { RouterLink: RouterLinkStub } }
    });
    await wrapper.findAll('button.is-info')[0].trigger('click'); // Click Edit on first item

    expect(wrapper.emitted('edit-sample-type')).toHaveLength(1);
    expect(wrapper.emitted('edit-sample-type')[0][0]).toEqual(mockSampleTypes[0]);
  });

  it('emits "delete-sample-type" with sample type ID when Delete button is clicked', async () => {
    const wrapper = mount(SampleTypeList, {
      props: { isLoading: false, sampleTypes: mockSampleTypes },
      global: { stubs: { RouterLink: RouterLinkStub } }
    });
    await wrapper.findAll('button.is-danger')[1].trigger('click'); // Click Delete on second item

    expect(wrapper.emitted('delete-sample-type')).toHaveLength(1);
    expect(wrapper.emitted('delete-sample-type')[0][0]).toBe(mockSampleTypes[1].id);
  });
});
