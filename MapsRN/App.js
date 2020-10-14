import React, {Component} from 'react';
import {Platform, StyleSheet, Text, View, TouchableOpacity, Switch, Image, PermissionsAndroid, StatusBar} from 'react-native';
import {widthPercentageToDP as wp, heightPercentageToDP as hp} from 'react-native-responsive-screen';
import MapView, {Marker} from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import PubNubReact from 'pubnub-react';

export default class App extends React.Component {
   
	constructor(props) {
		super(props);

		//Keys PUBNUB
		this.pubnub = new PubNubReact({
			publishKey: "pub-c-57cc915d-31ba-49ab-9c6b-86c041667ebd",
			subscribeKey: "sub-c-5095fd92-0c95-11eb-b978-f27038723aa3"
		});

		//Base state
		this.state = {
			localAtual: { //Rastreia a localização atual do usuário
				latitude: -1,
				longitude: -1
			},
			// numusuarios: 0, // Número de usuários no aplicativo
			// UUID: "",
			focoEmMim: false, //amplia o mapa para a localização atual do usuário, se verdadeiro
			usuarios: new Map(), // armazena dados de cada usuário em um mapa
			// focado: false,
			totUsuariosAtivos: 0,
			visivel: true, // alterna a capacidade do aplicativo de coletar dados de GPS do usuário
			regiao: ""
		};
		// (((1+Math.random())*0x10000)|0).toString(16).substring(1)
		this.pubnub.init(this);
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
				usuarios.delete(msg.publisher);
				this.setState({
					usuarios
				});
			}else{
				coord = [msg.message.latitude, msg.message.longitude]; //Formata

				//Busca usuario para alterar localizacao
				let oldUser = this.state.usuarios.get(msg.publisher);
				let newUser = {
					uuid: msg.publisher,
					latitude: msg.message.latitude,
					longitude: msg.message.longitude,
				};

				if(msg.message.message){
					Timeout.set(msg.publisher, this.clearMessage, 5000, msg.publisher);
					newUser.message = msg.message.message;
				}else if(oldUser){
					newUser.message = oldUser.message
				}

				this.atualizaQtdeUsuariosOn();

				usuarios.set(newUser.uuid, newUser);
				this.setState({
					usuarios
				});
			}
		});

		this.pubnub.subscribe({
			channels: ["global"],
			withPresence: true
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
						};
						
						usuarios.set(tempUser.uuid, tempUser);
						
						this.setState({
							usuarios,
							localAtual: position.coords
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
		if (prevState.visivel != this.state.visivel) { // verifica se o usuário alterou suas configurações de GPS
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
				console.log('UPDATE USER-----------------', tempUser);
				usuarios.set(tempUser.uuid, tempUser);
				
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
			regiao = {
				latitude: this.state.localAtual.latitude,
				longitude: this.state.localAtual.longitude,
				latitudeDelta: 0.01,
				longitudeDelta: 0.01
			};
			this.setState({
				focoEmMim: true
			});

			console.log('REGIAO----------------------------',regiao);
			this.map.animateToRegion(regiao, 2000);
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
		regiao = {
			latitude: coords.latitude,
			longitude: coords.longitude,
			latitudeDelta: 0.01,
			longitudeDelta: 0.01
		};
		this.map.animateToRegion(regiao, speed);
	};

	render() {
		// console.disableYellowBox = true; 
		let usuariosArray = Array.from(this.state.usuarios.values());
		//  {"actualChannel": null, "channel": "global", "message": {"latitude": -28.44075171, "longitude": -52.20156785}, "publisher": "pn-6501d516-4ac7-4c95-8c5e-4f597446b381", "subscribedChannel": "global", "subscription": null, "timetoken": "16025452303063757"}

		return (
			
			<View style={styles.container}>
				{/* Esconde status bar */}
				<StatusBar hidden={true} />
				
				{/* Mapa */}
				<MapView
					style={styles.map}
					ref={ref => (this.map = ref)}
					onMoveShouldSetResponder={this.draggedMap}
					initialRegion={{
						latitude: this.state.localAtual.latitude,
						longitude: this.state.localAtual.longitude,
						latitudeDelta: 0.01,
						longitudeDelta: 0.01
					}}
				>
				{/* {console.log("usuarios: "+ this.state.usuarios.values())} */}
				
				{/* Marcador pra cada usuário */}
				{usuariosArray.map((item) => (
					<Marker
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
					
					<Image
						style={styles.profile}
						source={
							(this.state.localAtual.latitude ==  item.latitude) ?
							require('./assets/marker_eu.png'):
							require('./assets/marker_outro.png')
						}
					/>
					</Marker>
				))}
				</MapView>
				
				{/* Top Bar */}
        		<View style={styles.containerTopBar}>
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
			</View>
		);
	}
}

const styles = StyleSheet.create({
	containerTopBar: {
		alignSelf: 'center',
		width: wp("100%"),
		height: hp("8%"),
		flexDirection: 'row', // row
		backgroundColor: '#292c2e',
		alignItems: 'center',
		justifyContent: 'center', // center, space-around
		paddingLeft: wp("2%"),
		paddingRight: wp("2%")
	},
	topBarText:{
		color:'white',
		justifyContent: 'center',
		paddingTop: hp("1%")
	},
	topBarImgLeft: {
		width: hp("4.5%"),
		height: hp("4.5%"),
		marginRight: wp("2%"),
	},

	topBarLogo: {
		width: hp("21.5%"),
		height: hp("5.5%"),
	},

	txtCircle:{
		width: hp("3.0%"),
		height: hp("3.0%"),
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#0084ff',
		borderStyle: 'solid',
		justifyContent: 'center',
		backgroundColor:'white'
		
	},
	bottomRow:{
		flexDirection: "row-reverse",
		justifyContent: "space-between",
		alignItems: "center"
	},
	marker: {
		justifyContent: "center",
		alignItems: "center",
		marginTop: Platform.OS === "android" ? 100 : 0,
	},
	top: {
		top: Platform.OS === "android" ? hp('2%') : hp('5%'),
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		// marginHorizontal: wp("2%"),
	},
	rightBar: {
		width: wp("100%"),
		flexDirection: "row",
		justifyContent: "flex-end",
		alignItems: "center"
	},
	container: {
		flex: 1
	},
	containerBottomBar: {
		position: "absolute",
		bottom: 0,
		width: "100%",
		padding: wp("2%"),
		// marginBottom: hp("4%"),
		alignSelf: 'stretch',
		height: hp("8%"),
		flexDirection: 'row', // row
		backgroundColor: '#292c2e',
		alignItems: 'center',
		justifyContent: 'space-between', // center, space-around
		paddingLeft: wp("2%"),
		paddingRight: wp("2%")
	},
	foco: {
		width: hp("4.5%"),
		height: hp("4.5%"),
		marginRight: wp("3%"),
	},
	map: {
		...StyleSheet.absoluteFillObject
	},
	profile: {
		width: hp("7.5%"),
		height: hp("7.5%")
	},
});