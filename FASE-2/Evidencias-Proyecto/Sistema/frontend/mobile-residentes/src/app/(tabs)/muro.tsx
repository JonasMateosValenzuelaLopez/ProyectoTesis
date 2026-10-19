import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, 
  Modal, TextInput, Scrollable, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MuroScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoContenido, setNuevoContenido] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState('Aviso General');

  const [publicaciones, setPublicaciones] = useState([
    { id: '1', autor: 'Comité de Administración', unidad: 'Oficina', titulo: 'Mantención de Ascensores', tipo: 'Comunicado', fecha: 'Hoy, 09:00 hrs', contenido: 'Estimados vecinos, el día martes se realizará mantención preventiva en la torre B.' },
    { id: '2', autor: 'Juan Pérez', unidad: 'Casa 15', titulo: 'Paseo de perros solidario', tipo: 'Comunidad', fecha: 'Ayer', contenido: 'Hola a todos, ¿alguien recomienda a un cuidador de mascotas para este fin de semana?' },
  ]);

  const handlePublicar = () => {
    if (!nuevoTitulo || !nuevoContenido) return;
    const nueva = {
      id: String(publicaciones.length + 1),
      autor: 'Tú (Casa 15)',
      unidad: 'Casa 15',
      titulo: nuevoTitulo,
      tipo: tipoSeleccionado,
      fecha: 'Hace un momento',
      contenido: nuevoContenido,
    };
    setPublicaciones([nueva, ...publicaciones]);
    setNuevoTitulo('');
    setNuevoContenido('');
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={publicaciones}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.authorRow}>
                <Ionicons name="person-circle-outline" size={24} color="#2A9D8F" />
                <View>
                  <Text style={styles.authorName}>{item.autor}</Text>
                  <Text style={styles.authorUnit}>{item.unidad}</Text>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: item.tipo === 'Comunicado' ? 'rgba(42, 157, 143, 0.1)' : 'rgba(244, 162, 97, 0.1)' }]}>
                <Text style={[styles.badgeText, { color: item.tipo === 'Comunicado' ? '#2A9D8F' : '#F4A261' }]}>{item.tipo}</Text>
              </View>
            </View>
            <Text style={styles.titulo}>{item.titulo}</Text>
            <Text style={styles.contenido}>{item.contenido}</Text>
            <Text style={styles.fecha}>{item.fecha}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContainer}
      />

      {/* Botón flotante para abrir el modal de publicación */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal para Crear Publicación */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Publicación</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>Título del aviso</Text>
              <TextInput style={styles.input} placeholder="Ej: Objeto perdido en estacionamientos" value={nuevoTitulo} onChangeText={setNuevoTitulo} />

              <Text style={styles.label}>Categoría</Text>
              <View style={styles.tipoContainer}>
                {['Aviso General', 'Comunidad', 'Seguridad'].map((t) => (
                  <TouchableOpacity 
                    key={t} 
                    style={[styles.tipoChip, tipoSeleccionado === t && styles.tipoChipSelected]}
                    onPress={() => setTipoSeleccionado(t)}
                  >
                    <Text style={[styles.tipoChipText, tipoSeleccionado === t && styles.tipoChipTextSelected]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Contenido del mensaje</Text>
              <TextInput style={[styles.input, styles.textArea]} placeholder="Escribe los detalles aquí..." multiline={true} numberOfLines={4} value={nuevoContenido} onChangeText={setNuevoContenido} />

              <TouchableOpacity style={styles.publishButton} onPress={handlePublicar}>
                <Text style={styles.publishButtonText}>Publicar en el Muro</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  listContainer: { padding: 15, paddingBottom: 80 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  authorUnit: { fontSize: 12, color: '#888' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  titulo: { fontSize: 16, fontWeight: 'bold', color: '#2A9D8F', marginBottom: 6 },
  contenido: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 10 },
  fecha: { fontSize: 11, color: '#aaa', textAlign: 'right' },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#2A9D8F', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2A9D8F' },
  label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 15, color: '#333' },
  textArea: { height: 100, textAlignVertical: 'top' },
  tipoContainer: { flexDirection: 'row', gap: 8, marginBottom: 5 },
  tipoChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f9f9f9' },
  tipoChipSelected: { backgroundColor: '#2A9D8F', borderColor: '#2A9D8F' },
  tipoChipText: { fontSize: 12, color: '#666' },
  tipoChipTextSelected: { color: '#fff', fontWeight: 'bold' },
  publishButton: { backgroundColor: '#2A9D8F', borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 25, marginBottom: 20 },
  publishButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});