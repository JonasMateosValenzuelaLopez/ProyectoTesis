import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ImageBackground, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Viene preinstalado en Expo

export default function LoginScreen({ navigation }) {
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    console.log('Iniciando sesión en app con RUT:', rut);
    // Aquí Camila conectará la API RESTful de Node.js para autenticar al residente
    // navigation.replace('MainTabs'); // Navegar hacia el muro una vez autenticado
  };

  return (
    <View style={styles.container}>
      {/* Mitad Superior: Imagen de Bienvenida */}
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' }} 
        style={styles.headerImage}
      >
        <View style={styles.overlay}>
          <SafeAreaView>
            <Text style={styles.title}>EntreCasas</Text>
            <Text style={styles.subtitle}>Tu comunidad en tu bolsillo</Text>
          </SafeAreaView>
        </View>
      </ImageBackground>

      {/* Mitad Inferior: Formulario (Bottom Sheet) */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.welcomeText}>Bienvenido vecino</Text>
          <Text style={styles.instructionText}>Ingresa con tu RUT para continuar</Text>

          {/* Input RUT */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="RUT (ej: 12345678-9)"
              value={rut}
              onChangeText={setRut}
              keyboardType="default"
              autoCapitalize="none"
            />
          </View>

          {/* Input Contraseña */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Recuperar Contraseña */}
          <TouchableOpacity style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {/* Botón Principal */}
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Ingresar</Text>
          </TouchableOpacity>

          {/* Solicitar Acceso */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿Eres nuevo en el condominio? </Text>
            <TouchableOpacity>
              <Text style={styles.registerLink}>Solicita acceso</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerImage: {
    flex: 0.45, // Ocupa el 45% de la pantalla
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 157, 143, 0.75)', // Azul Cerceta con opacidad
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.9,
  },
  formContainer: {
    flex: 0.55,
    backgroundColor: '#fff',
    marginTop: -30, // Sube la tarjeta para superponerse a la imagen
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  sheetContent: {
    flex: 1,
    padding: 25,
    paddingTop: 35,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2A9D8F',
    marginBottom: 5,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 55,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 25,
  },
  forgotPasswordText: {
    color: '#F4A261', // Coral
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#2A9D8F',
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2A9D8F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  registerText: {
    color: '#666',
  },
  registerLink: {
    color: '#2A9D8F',
    fontWeight: 'bold',
  },
});