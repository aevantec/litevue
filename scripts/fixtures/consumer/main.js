// A consumer importing the package by name, as an app would. Resolved through
// package.json `exports`, so the `development` condition picks the dev build.
import { createApp } from '@aevantec/litevue';

createApp({ counter: 0 }).mount();
