<template>
  <div id="app-layout">
    <nav>
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script setup>
// No specific script needed here for basic layout
</script>

<style>
#app-layout {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
nav {
  padding: 20px;
  background-color: #f0f0f0;
}
nav a {
  font-weight: bold;
  color: #2c3e50;
  margin: 0 10px;
  text-decoration: none;
}
nav a.router-link-exact-active {
  color: #42b983;
}
</style>
