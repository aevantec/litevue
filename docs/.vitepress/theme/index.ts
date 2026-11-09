import DefaultTheme from 'vitepress/theme';
import DevtoolsPreview from './DevtoolsPreview.vue';
import DevtoolsPreviewFrame from './DevtoolsPreviewFrame.vue';
import LiveDemo from './LiveDemo.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: { app: any }) {
    app.component('LiveDemo', LiveDemo);
    app.component('DevtoolsPreview', DevtoolsPreview);
    app.component('DevtoolsPreviewFrame', DevtoolsPreviewFrame);
  },
};
