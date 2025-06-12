import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import GreetingMessage from './GreetingMessage.vue';

describe('GreetingMessage.vue', () => {
  it('renders props.msg when passed', () => {
    const msg = 'Hello, Vue Test!';
    const wrapper = mount(GreetingMessage, {
      props: { msg }
    });
    expect(wrapper.text()).toContain(msg);
  });

  it('renders default message if no prop is passed', () => {
    const wrapper = mount(GreetingMessage);
    expect(wrapper.text()).toContain('Hello');
  });
});
