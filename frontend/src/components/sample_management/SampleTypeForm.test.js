import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SampleTypeForm from './SampleTypeForm.vue';

describe('SampleTypeForm.vue', () => {
  it('renders correctly in "add" mode', () => {
    const wrapper = mount(SampleTypeForm, {
      props: { isEditMode: false }
    });
    expect(wrapper.find('h3.subtitle').text()).toBe('Add New Sample Type');
    expect(wrapper.find('input#type-name').exists()).toBe(true);
    expect(wrapper.find('textarea#type-desc').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').text()).toBe('Add Sample Type');
    expect(wrapper.find('button[type="button"]').text()).toBe('Cancel');
  });

  it('renders correctly in "edit" mode with initial data', () => {
    const initialData = { name: 'Blood', description: 'Whole blood sample' };
    const wrapper = mount(SampleTypeForm, {
      props: {
        isEditMode: true,
        initialData: initialData
      }
    });
    expect(wrapper.find('h3.subtitle').text()).toBe('Edit Sample Type');
    expect(wrapper.find('input#type-name').element.value).toBe(initialData.name);
    expect(wrapper.find('textarea#type-desc').element.value).toBe(initialData.description);
    expect(wrapper.find('button[type="submit"]').text()).toBe('Save Changes');
  });

  it('requires name for submission', async () => {
    const wrapper = mount(SampleTypeForm, {
      props: { isEditMode: false }
    });
    await wrapper.find('form').trigger('submit.prevent');
    expect(wrapper.emitted('submit-form')).toBeUndefined();
    expect(wrapper.find('.help.is-danger').text()).toContain('Name is required.');
  });

  it('emits "submit-form" with form data on valid submission', async () => {
    const wrapper = mount(SampleTypeForm, {
      props: { isEditMode: false }
    });
    const testData = { name: 'Plasma', description: 'Test description' };
    await wrapper.find('input#type-name').setValue(testData.name);
    await wrapper.find('textarea#type-desc').setValue(testData.description);
    await wrapper.find('form').trigger('submit.prevent');

    expect(wrapper.emitted('submit-form')).toHaveLength(1);
    expect(wrapper.emitted('submit-form')[0][0]).toEqual(testData);
    expect(wrapper.find('.help.is-danger').text()).toBe(''); // No error
  });

  it('emits "submit-form" with updated data in edit mode', async () => {
    const initialData = { name: 'Blood', description: 'Original' };
    const wrapper = mount(SampleTypeForm, {
      props: {
        isEditMode: true,
        initialData: initialData
      }
    });
    const updatedName = 'Blood Updated';
    await wrapper.find('input#type-name').setValue(updatedName);
    await wrapper.find('form').trigger('submit.prevent');

    expect(wrapper.emitted('submit-form')).toHaveLength(1);
    expect(wrapper.emitted('submit-form')[0][0]).toEqual({ name: updatedName, description: initialData.description });
  });

  it('emits "cancel-form" when cancel button is clicked', async () => {
    const wrapper = mount(SampleTypeForm);
    await wrapper.find('button[type="button"]').trigger('click');
    expect(wrapper.emitted('cancel-form')).toHaveLength(1);
  });

  it('updates form when initialData prop changes in edit mode', async () => {
    const initialData1 = { name: 'Type1', description: 'Desc1' };
    const wrapper = mount(SampleTypeForm, {
      props: {
        isEditMode: true,
        initialData: initialData1
      }
    });
    expect(wrapper.find('input#type-name').element.value).toBe('Type1');

    const initialData2 = { name: 'Type2', description: 'Desc2' };
    await wrapper.setProps({ initialData: initialData2 });

    expect(wrapper.find('input#type-name').element.value).toBe('Type2');
    expect(wrapper.find('textarea#type-desc').element.value).toBe('Desc2');
  });
});
