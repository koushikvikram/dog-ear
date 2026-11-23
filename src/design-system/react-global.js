// The design-system bundle is a browser IIFE that reads React from window.React when it runs.
// This module is imported before bundle.js so that global exists, and it is the app's own React,
// so hooks and context are shared between the app and the bundle's components.
import React from 'react'

window.React = React
