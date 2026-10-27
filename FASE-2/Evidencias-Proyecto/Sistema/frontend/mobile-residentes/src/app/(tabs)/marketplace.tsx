import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const productos = [
  { id: '1', nombre: 'Bicicleta de montaña', precio: '$85.000', vecindario: 'Casa 15' },
  { id: '2', nombre: 'Clases particulares de Inglés', precio: '$10.000 / hora', vecindario: 'Depto 302' },
];

export default function MarketplaceScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={productos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.infoContainer}>
              <Text style={styles.nombre}>{item.nombre}</Text>
              <Text style={styles.precio}>{item.precio}</Text>
              <Text style={styles.vecindario}>Publicado por: {item.vecindario}</Text>
            </View>
            <TouchableOpacity style={styles.contactButton}>
              <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  listContainer: { padding: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  infoContainer: { flex: 1 },
  nombre: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  precio: { fontSize: 15, fontWeight: 'bold', color: '#2A9D8F', marginBottom: 4 },
  vecindario: { fontSize: 12, color: '#888' },
  contactButton: { backgroundColor: '#F4A261', padding: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});