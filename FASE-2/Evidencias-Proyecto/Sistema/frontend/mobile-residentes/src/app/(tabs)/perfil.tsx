import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PerfilScreen() {
  const [editando, setEditando] = useState(false);
  const [usuario, setUsuario] = useState({
    nombre: 'Juan Pérez',
    rut: '19.876.543-2',
    correo: 'juan.perez@correo.cl',
    telefono: '+56 9 1234 5678',
    unidad: 'Casa 15',
    condominio: 'Condominio Las Palmas'
  });

  const handleGuardar = () => {
    setEditando(false);
    Alert.alert('Éxito', 'Tus datos han sido actualizados correctamente.');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Cabecera del Perfil */}
      <View style={styles.headerCard}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={50} color="#2A9D8F" />
        </View>
        <Text style={styles.nombre}>{usuario.nombre}</Text>
        <Text style={styles.unidadBadge}>{usuario.unidad} • {usuario.condominio}</Text>
      </View>

      {/* Formulario de Datos / Edición */}
      <View style={styles.formCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          <TouchableOpacity onPress={() => setEditando(!editando)}>
            <Ionicons name={editando ? "close-outline" : "create-outline"} size={22} color="#2A9D8F" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Nombre Completo</Text>
        <TextInput 
          style={[styles.input, !editando && styles.inputDisabled]} 
          value={usuario.nombre} 
          editable={editando}
          onChangeText={(text) => setUsuario({ ...usuario, nombre: text })}
        />

        <Text style={styles.label}>RUT</Text>
        <TextInput style={[styles.input, styles.inputDisabled]} value={usuario.rut} editable={false} />

        <Text style={styles.label}>Correo Electrónico</Text>
        <TextInput 
          style={[styles.input, !editando && styles.inputDisabled]} 
          value={usuario.correo} 
          editable={editando}
          onChangeText={(text) => setUsuario({ ...usuario, correo: text })}
        />

        <Text style={styles.label}>Teléfono de Contacto</Text>
        <TextInput 
          style={[styles.input, !editando && styles.inputDisabled]} 
          value={usuario.telefono} 
          editable={editando}
          onChangeText={(text) => setUsuario({ ...usuario, telefono: text })}
        />

        {editando && (
          <TouchableOpacity style={styles.saveButton} onPress={handleGuardar}>
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Botón de Cerrar Sesión */}
      <TouchableOpacity style={styles.logoutButton} onPress={() => Alert.alert('Sesión Cerrada')}>
        <Ionicons name="log-out-outline" size={20} color="#E63946" />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8', padding: 15 },
  headerCard: { backgroundColor: '#fff', borderRadius: 16, padding: 25, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  avatarContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(42, 157, 143, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  nombre: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  unidadBadge: { fontSize: 14, color: '#2A9D8F', fontWeight: '600' },
  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 15, color: '#333' },
  inputDisabled: { backgroundColor: '#F1F3F5', color: '#555' },
  saveButton: { backgroundColor: '#2A9D8F', borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logoutButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, height: 55, borderWidth: 1, borderColor: 'rgba(230, 57, 70, 0.3)', marginBottom: 40 },
  logoutText: { color: '#E63946', fontSize: 16, fontWeight: 'bold' },
});