import React, {Component} from 'react';
import {Platform, StyleSheet, Text, TextInput, View, TouchableOpacity, Switch, Image, PermissionsAndroid, StatusBar, Modal, LogBox} from 'react-native';
import {widthPercentageToDP as wp, heightPercentageToDP as hp} from 'react-native-responsive-screen';
import MapView, {Marker} from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import getDirections from 'react-native-google-maps-directions'
import Geolocation from '@react-native-community/geolocation';
import PubNubReact from 'pubnub-react';
import styles from "./styles/MapsStyle";
const GOOGLE_MAPS_APIKEY = 'AIzaSyAs_3ZowQo12YCw2yWl9hDad8LNDGhUnD8';
import { YellowBox } from "react-native";
export default class App extends React.Component {
	
	constructor(props) {
		YellowBox.ignoreWarnings([""]);
		super(props);

		//Keys PUBNUB
		this.pubnub = new PubNubReact({
			publishKey: "pub-c-57cc915d-31ba-49ab-9c6b-86c041667ebd",
			subscribeKey: "sub-c-5095fd92-0c95-11eb-b978-f27038723aa3"
		});

		this.state = {
			localAtual: { //Rastreia a localização atual do usuário
				latitude: -1,
				longitude: -1
			},
			rota_latitude: -1,
			rota_longitude: -1,
			uuid: "",
			// username: "",
			focoEmMim: true, //amplia o mapa para a localização atual do usuário, se verdadeiro
			usuarios: new Map(), // armazena dados de cada usuário em um map
			// focado: false,
			totUsuariosAtivos: 0,
			visivel: true, // alterna a capacidade do aplicativo de coletar dados de GPS do usuário
			regiao: "",
			modalVisivel: false,
			inputTextNome: ""
		};
		// (((1+Math.random())*0x10000)|0).toString(16).substring(1)
		this.pubnub.init(this);
	}

	modalVisivel = (bool) => {
		this.setState({ modalVisivel: bool })
	}

	async componentDidMount() {
		this.setUpApp()
  	}

	async setUpApp(){
		
		
		let permConcedida;

		if (Platform.OS === "android"){
			permConcedida = await PermissionsAndroid.request( PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION ,
			{
				title: 'Permissão',
				message:
				'Maps precisa do acesso à sua localização',
				buttonNegative: 'Não',
				buttonPositive: 'Sim',
			});      
		}

		//Pega as atualizações publicadas no canal e atualiza as variáveis ​​de estado
		this.pubnub.getMessage("global", msg => {
			let usuarios = this.state.usuarios;
			//Se solicitação do usuário para ocultar seus dados, remove
			if (msg.message.hideUser) {
				// console.log(msg);
				usuarios.delete(msg.publisher);
				this.setState({
					usuarios
				});
			}else{
				coord = [msg.message.latitude, msg.message.longitude]; //Formata

				//Busca usuario para alterar localizacao
				let oldUser = this.state.usuarios.get(msg.publisher);
				
				var usernameTemp = "";
				// if (this.state.uuid ==  msg.message.uuid) {
					// usernameTemp = this.state.username;
				// }else{
				 	usernameTemp = msg.username;
				// }

				let newUser = {
					uuid: msg.message.uuid,
					latitude: msg.message.latitude,
					longitude: msg.message.longitude,
					username: usernameTemp
				};

				if(msg.message.message){
					Timeout.set(msg.publisher, this.clearMessage, 5000, msg.publisher);
					newUser.message = msg.message.message;
				}else if(oldUser){
					newUser.message = oldUser.message
				}

				this.atualizaQtdeUsuariosOn();
				if(typeof newUser.uuid !== "undefined"){
					usuarios.set(newUser.uuid, newUser);
				}
				// console.log('*******************************************************************');
				// console.log(usuarios);
				// Map {"pn-8b1ca91a-334a-4170-8447-e207ffff89d9" => 
				// 	{"latitude": -28.440497306514757, "longitude": -52.21574427619677, "uuid": "pn-8b1ca91a-334a-4170-8447-e207ffff89d9"}, 
				// 	undefined => {"latitude": -28.440497306514757, "longitude": -52.21574427619677, "message": undefined, "uuid": undefined}}
				this.setState({
					usuarios
				});
			}
		});

		this.pubnub.subscribe({
			channels: ["global"],
			withPresence: true //permite que eventos de presença sejam enviados para este canal 
		});

		if (permConcedida === PermissionsAndroid.RESULTS.GRANTED || Platform.OS === "ios") { 
			Geolocation.getCurrentPosition(
				position => {
					if (this.state.visivel) {
						this.pubnub.publish({
							message: {
								latitude: position.coords.latitude,
								longitude: position.coords.longitude,
							},
							channel: "global"
						});

						let usuarios = this.state.usuarios;
						
						let tempUser = {
							uuid: this.pubnub.getUUID(),
							latitude: position.coords.latitude,
							longitude: position.coords.longitude,
							username: this.state.username
						};
						usuarios.set(tempUser.uuid, tempUser);


						// console.log('-----------------------------');
						// console.log(usuarios);
						// console.log('-----------------------------');
						
						this.setState({
							usuarios,
							localAtual: position.coords,
							uuid: tempUser.uuid,
							username: this.state.username
						});
					}
				},
				error => console.log("Maps Error: ", error),
				{ enableHighAccuracy: true,}
			);

			// Rastrear movimento
			Geolocation.watchPosition(
				position => {
					this.setState({
						localAtual: position.coords
					});
					if (this.state.visivel) {
						this.pubnub.publish({
							message: {
								latitude: position.coords.latitude,
								longitude: position.coords.longitude,
							},
							channel: "global"
						});
					}
					// console.log('USUÁRIO POSIÇÃO: ' + position.coords);
				},
				error => console.log("Maps Error: ", error),
				{
					enableHighAccuracy: true,
					distanceFilter: 10
				}
			);
		}else {
			console.log( "ACCESS_FINE_LOCATION permission denied" )
		}
	}

	componentDidUpdate(prevProps, prevState) {
		if ((prevState.localAtual.latitude != this.state.localAtual.latitude) || (prevState.visivel != this.state.visivel)) { // verifica se o usuário alterou suas configurações de GPS
			if (this.state.visivel) { 
				if (this.state.focoEmMim) { // se alterou para focar em si mesmo
					this.animaAteDestino(this.state.localAtual, 1000);
				}
				
				let usuarios = this.state.usuarios;
				
				// cria um novo objeto de usuário com valores de usuário atualizados para substituir o usuário antigo
				let tempUser = {
					uuid: this.pubnub.getUUID(),
					latitude: this.state.localAtual.latitude,
					longitude: this.state.localAtual.longitude,
					username: this.state.username
				};
				// console.log('UPDATE USER-----------------', tempUser);
				usuarios.set(tempUser.uuid, tempUser);

				// this.setState({destino: this.state.localAtual});
				
				// atualiza o mapa do usuário localmente
				this.setState(
					{
						usuarios
					},
					() => {
							this.pubnub.publish({ // publica dados para atualizar o mapa de todos os usuários
								message: tempUser,
								channel: "global"
							});
					}
				);
			} else { // se o usuário alterou para ocultar seus dados
				let usuarios = this.state.usuarios;
				let uuid = this.pubnub.getUUID();

				usuarios.delete(uuid); // exclui este usuário do mapa

				this.setState({
					usuarios,
				});

				// permite que todos os outros usuários saibam que esse usuário deseja ficar oculto
				this.pubnub.publish({
					message: {
						hideUser: true
					},
					channel: "global"
				});
			}
		}
	}

	foco = () => {
		// if (this.state.focoEmMim || this.state.UUID) {
		if (this.state.focoEmMim) {
			this.setState({
				focoEmMim: false,
				// UUID: ""
			});
		} else {
			this.regiao = {
				latitude: this.state.localAtual.latitude,
				longitude: this.state.localAtual.longitude,
				latitudeDelta: 0.01,
				longitudeDelta: 0.01
			};
			this.setState({
				focoEmMim: true
			});

			// console.log('REGIAO----------------------------',regiao);
			this.map.animateToRegion(this.regiao, 2000);
		}
	}

	visibilidadeGPS = () => {
		this.setState({
			visivel: !this.state.visivel
		});
	};

	atualizaQtdeUsuariosOn = () => {
		var usuariosAtivos = 0;
		this.pubnub.hereNow({
			includeUUIDs: true,
			includeState: true
		},
		function (status, response) {
			// handle status, response
			if(response != undefined){
				usuariosAtivos = response.occupancy;
			}
		});
		var totalUsuariosAtivos = Math.max(usuariosAtivos, this.state.usuarios.size)
		this.setState({totUsuariosAtivos: totalUsuariosAtivos})
	};

	animaAteDestino = (coords, speed) => {
		this.regiao = {
			latitude: coords.latitude,
			longitude: coords.longitude,
			latitudeDelta: 0.01,
			longitudeDelta: 0.01
		};
		this.map.animateToRegion(this.regiao, speed);
	};

	setInputTexto = (nome) => {
		this.setState({ 
			inputTextNome: nome,
		})
	}

	tracaRota = (uuid, latitude, longitude) => {
		if (this.state.uuid !=  uuid ) {
			this.setState({ 
				rota_latitude: latitude,
				rota_longitude: longitude,
			})
		}
	}

	limpaRota = () => {
		this.setState({ 
			rota_latitude: -1,
			rota_longitude: -1,
		})
	}

	render() {
			// console.disableYellowBox = true; 
		let usuariosArray = Array.from(this.state.usuarios.values());
		//  {"actualChannel": null, "channel": "global", "message": {"latitude": -28.44075171, "longitude": -52.20156785}, "publisher": "pn-6501d516-4ac7-4c95-8c5e-4f597446b381", "subscribedChannel": "global", "subscription": null, "timetoken": "16025452303063757"}

		return (
			
			<View style={styles.container}>
				{/* Esconde status bar */}
				<StatusBar hidden={true} />

				<Modal transparent={true}  animationType="fade" visible={this.state.modalVisivel} 
                  onRequestClose={() => this.modalVisivel(false)} style={styles.modalContainer}>
                  <View style={styles.modalView}>
                      <View style={styles.footerView}>
                        <Text style={styles.footerText}>
                          <Text>
                            Nome
                          </Text>
                        </Text>
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="Nome"
                        placeholderTextColor="#aaaaaa"
                        onChangeText={(username) => {
                                                        this.setState({inputTextNome: username, username: username}); 
                                                        // console.log('state ', this.state.inputTextNome)
                                                      }}
                        defaultValue={this.state.inputTextNome}
                        underlineColorAndroid="transparent"
                        editable = {true}
                        multiline = {false}
                        autoCapitalize="words"
                      />

                      <TouchableOpacity style={styles.button} onPress={() => {this.setInputTexto(this.state.inputTextNome); this.modalVisivel(false); this.setUpApp()}} >
                        <Text style={styles.buttonTitle}>Confirmar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.buttonCancel} onPress={() => {this.modalVisivel(false)}} >
                        <Text style={styles.buttonTitle}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>           
                </Modal> 
				
				{/* Mapa */}
				<MapView
					style={styles.map}
					ref={ref => (this.map = ref)}
					// onMoveShouldSetResponder={this.draggedMap}
					initialRegion={{
						latitude: this.state.localAtual.latitude,
						longitude: this.state.localAtual.longitude,
						latitudeDelta: 0.01,
						longitudeDelta: 0.01
					}}
				>
				{/* {console.log("usuarios: "+ usuariosArray.values().uuid)} */}
				
				{/* Marcador pra cada usuário */}
				{usuariosArray.map((item) => (
					<Marker
					 	onPress={() => this.tracaRota(item.uuid, item.latitude, item.longitude)}
						style={styles.marker}
						key={item.uuid}
						coordinate={{
							latitude: item.latitude,
							longitude: item.longitude
						}}
						ref={marker => {
							this.marker = marker;
						}}
					>

					{/* {this.state.uuid ==  item.uuid && ( */}
						<Text>{item.username}</Text>
					{/* )}  */}

					{/* <Text>{item.uuid}</Text> */}
						
						<Image
							style={styles.profile}
							source={
								// (this.state.localAtual.latitude ==  item.latitude) ?
								(this.state.uuid ==  item.uuid) ?
								require('./assets/marker_eu.png'):
								require('./assets/marker_outro.png')
							}
						/>
					</Marker>
				))}
				{/* MOSTRA A ROTA	 */}
					<MapViewDirections
						origin = {this.state.localAtual.latitude +',' + this.state.localAtual.longitude}
						destination= {this.state.rota_latitude +',' + this.state.rota_longitude}
						strokeWidth={3}
						strokeColor="rgb(0,139,241)"
						apikey={GOOGLE_MAPS_APIKEY}
					/>

				</MapView>
				
				{/* Top Bar */}
        		<View style={styles.containerTopBar}>
					
					{/* <TouchableOpacity onPress={() => {this.modalVisivel(true);}}>
						<Image style={styles.topBarLogo} source={require('./assets/logo.png')} />
					</TouchableOpacity> */}
					<View style={{ flexDirection: 'row', justifyContent: 'center' }}>
						<Image style={styles.topBarLogo} source={require('./assets/logo.png')} />
					</View>	
				</View>

			
				{/* Bottom Bar */}
				<View style={styles.containerBottomBar}>
					<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
						<Image style={styles.topBarImgLeft} source={require('./assets/usu_ativos.png')} />
						<View style={styles.txtCircle}>
							<Text style={{fontSize: 10,textAlign: 'center', color:'#0084ff'}}>{this.state.totUsuariosAtivos}</Text>
						</View>
					</View>	
					<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
						<Image style={styles.topBarImgLeft} source={require('./assets/visivel.png')} />
						<Switch
						 	trackColor={{ false: "#767577", true: "#81b0ff" }}
							thumbColor={this.state.visivel ? "#0084ff" : "#f4f3f4"}
							ios_backgroundColor="#3e3e3e"
							value={this.state.visivel}
							onValueChange={this.visibilidadeGPS}
						/>
					</View>	
				</View>

				<View style={styles.top}>
					<View style={styles.rightBar}>
						<TouchableOpacity onPress={this.foco}>
							<Image style={styles.foco} source={require('./assets/crosshair.png')} />
						</TouchableOpacity>
					</View>
				</View>
				
				{this.state.rota_latitude != -1 && (
					<View style={styles.bottom}>
						<View style={styles.rightBar}>
							<TouchableOpacity onPress={this.limpaRota}>
								<Image style={styles.foco} source={require('./assets/route.png')} />
							</TouchableOpacity>
						</View>
					</View>
				)}
			</View>
		);
	}
}