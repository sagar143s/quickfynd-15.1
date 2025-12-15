import axios from "axios";

const DELHIVERY_API_TOKEN = process.env.DELHIVERY_API_TOKEN;

export async function checkPincodeServiceability(pincode) {
  const url = `https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${pincode}`;
  const headers = { Authorization: `Token ${DELHIVERY_API_TOKEN}` };
  const { data } = await axios.get(url, { headers });
  return data;
}

export async function getExpectedTAT(origin, destination, mot = "S", pdt = "B2C", expected_pickup_date = "") {
  let url = `https://track.delhivery.com/api/dc/expected_tat?origin_pin=${origin}&destination_pin=${destination}&mot=${mot}&pdt=${pdt}`;
  if (expected_pickup_date) url += `&expected_pickup_date=${expected_pickup_date}`;
  const headers = { Authorization: `Token ${DELHIVERY_API_TOKEN}` };
  const { data } = await axios.get(url, { headers });
  return data;
}

// Add more functions for other endpoints as needed
