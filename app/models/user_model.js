var db = require('../util/mysql_connection');
const bcrypt = require('bcrypt');
var md5 = require('md5')
const { get_user_transactions } = require('./transaction_model')

// function build_update_user_balance(username,new_balance){
//
//   return {
//     query:"UPDATE user SET clam_balance = ? WHERE username = ?;",
//     queryValues:[new_balance, username]
//   }
//
// }


function calculate_new_user_balance(original_clam_balance,prev_user_balance,change_in_clam_balance, rake_share){

  console.log("original_clam_balance,prev_user_balance,change_in_clam_balance, rake_share");
  console.log(original_clam_balance,prev_user_balance,change_in_clam_balance, rake_share);
  // console.log("calculate_new_user_balance\n",typeof(original_clam_balance),typeof(prev_user_balance),typeof(change_in_clam_balance), typeof(rake_share));
  let user_share = prev_user_balance*1.0/original_clam_balance;
  let new_balance = prev_user_balance + (1 - rake_share)*(change_in_clam_balance * user_share);

  console.log("prev_user_balance",prev_user_balance);
  console.log("user_share",user_share);
  // console.log("change_in_clam_balance * user_share",change_in_clam_balance * user_share);
  console.log("(1 - rake_share)*(change_in_clam_balance * user_share)",(1 - rake_share)*(change_in_clam_balance * user_share));
  // console.log("user_share",user_share);
  console.log("new_balance",new_balance);

  return new_balance;

}

async function get_all_users(){

  const [users, fields] = await db.connection.query("SELECT * FROM user WHERE username != 'clam_miner'");
  return users;
}

async function create_user(body){
  console.log("new user body", body)
  let username = body.username
  let password = body.password
  let email = body.email
  const saltRounds = 10;
  let hashedPassword = await bcrypt.hash(password, saltRounds)
  let verify_key = md5(username).slice(-5)
  let query = "INSERT INTO `user` (`username`, `password`, `level`, `clam_balance`, `last_login`, `email`, `email_verify_key`, `email_verify_flag`, `account_type`, `ledger_account`, `sub_account1`, `sub_account2`) VALUES (?, ?, 1, 0, CURRENT_TIMESTAMP, ?, ?, '0', '', '', NULL, NULL);"
  let result = db.connection.query(query, [username, hashedPassword, email, verify_key])
  console.log("signup", username)
  return verify_key
}

async function get_user_by_username(username){
  const [rows, fields] = await db.connection.query("SELECT * FROM user WHERE username = ?",[username]);
  return rows[0];
}

async function reset_password(email, new_pass){
  const saltRounds = 10;
  let hashedPassword = await bcrypt.hash(new_pass, saltRounds)
  const [rows, fields] = await db.connection.query("UPDATE user SET password = ? WHERE email = ?;", [hashedPassword, email])
  return rows[0];
}

async function add_referral(user, affiliate){
  console.log("add reffff")
  let query = "UPDATE user SET affiliate = ? WHERE username = ?;"
  let result = db.connection.query(query, [affiliate, user])
  console.log(result)
  return result
}
async function confirm_email(key){
  let query = "UPDATE user SET email_verify_flag = 1 WHERE email_verify_key = ?;"
  let result = await db.connection.query(query, [key])
  console.log(result)
  return result
}


async function get_balance(username){
  let user = await get_user_by_username(username);
  if(!user) throw new Error('User does not exist');

  let account_type = user.account_type;


  let transactions = await get_user_transactions(username);

  let total_credits = 0;
  let total_debits = 0;

  for(let i=0; i<transactions.length; i++){


    let user_transaction = transactions[i];
    let amount = parseFloat(user_transaction.amount);

    console.log("amount ",amount);

    if(amount < 0){
       total_credits += (amount * -1.0);
    }else{
      total_debits += amount;
    }

  }//end for

  let user_balance = 0;
  if (account_type == 'debit'){
    user_balance = total_debits - total_credits;
  }
  else {
    user_balance = total_credits - total_debits;
  }
  console.log("total_credits ",total_credits);
  console.log("total_debits ",total_debits);

  return user_balance;
}


module.exports = {
  // build_update_user_balance,
  calculate_new_user_balance,
  get_user_by_username,
  get_all_users,
  create_user,
  add_referral,
  confirm_email,
  get_balance,
  reset_password
};
