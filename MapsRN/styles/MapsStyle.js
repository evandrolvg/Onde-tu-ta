import {widthPercentageToDP as wp, heightPercentageToDP as hp} from 'react-native-responsive-screen';
import { StyleSheet } from "react-native";

export default StyleSheet.create({
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

	topBarImgCenter: {
		width: hp("4.5%"),
		height: hp("4.5%"),
		marginLeft: wp("6%"),
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
	bottom: {
		bottom: Platform.OS === "android" ? hp('10%') : hp('5%'),
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		position: "absolute"
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
		width: hp("7.5%"),
		height: hp("7.5%"),
		marginRight: wp("3%"),
	},
	map: {
		...StyleSheet.absoluteFillObject
	},
	profile: {
		width: hp("7.5%"),
		height: hp("7.5%")
  },
  // MODAL
	modalView: {
		backgroundColor: "#292c2e",
		margin: 10,
		marginTop:hp("25%"),
		borderRadius: 5,
		paddingBottom: 30,
	},
	modalContainer: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	input: {
		height: 48,
		borderRadius: 5,
		overflow: "hidden",
		backgroundColor: "white",
		marginTop: 20,
		marginBottom: 10,
		marginLeft: 30,
		marginRight: 30,
		paddingLeft: 16,
	},
	button: {
		backgroundColor: "#005cc5",
		marginLeft: 30,
		marginRight: 30,
		marginTop: 20,
		height: 48,
		borderRadius: 5,
		alignItems: "center",
		justifyContent: "center",
	},
	buttonCancel: {
		backgroundColor: "red",
		marginLeft: 30,
		marginRight: 30,
		marginTop: 20,
		height: 48,
		borderRadius: 5,
		alignItems: "center",
		justifyContent: "center",
	},
	buttonTitle: {
		color: "white",
		fontSize: 16,
		fontWeight: "bold",
	},
	imgEdit: {
		height:100,
	},
	name: {
		// height: 48,
		borderRadius: 5,
		overflow: "hidden",
		backgroundColor: "#dcdcdc",
		alignContent: "center",
		padding: 7,
	},
});
