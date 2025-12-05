
// Import React
import React from 'react';
// Import ReactTestRenderer untuk melakukan rendering komponen secara virtual (unit test)
import ReactTestRenderer from 'react-test-renderer';
// Import komponen utama aplikasi
import App from '../App';

// Unit test untuk memastikan App bisa dirender tanpa error
test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
