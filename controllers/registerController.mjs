import {pool}  from '../models/pgConfig.mjs'
import {createRepo} from '../helper.mjs'

import dotenv from 'dotenv'
dotenv.config()

async function index(req, res)
	{
		const sql1 = `select id, house from houses where id <> 1 and is_active = true;`
		pool.query(sql1, (err, res1)=>
			{
				if(err)
					console.log('Error in taking house:\n', err)
				res.render('register/index.ejs', {
					houses: res1.rows,
					username: req.session.username, 
					email: req.session.email})
			})
	}




async function register(req, res)
	{
		const client = await pool.connect();
		try{
			await client.query('BEGIN');
			const res1 = await client.query(`select * from characters where username = $1`, [req.session.username]) 
			if(res1.rows.length > 0) 
			{ 
				client.query('COMMIT');
				res.redirect('/character/gradebook') 
			} 
			else 
			{ 
				await createRepo(process.env.ORGANIZATION, process.env.TSPU_TOKEN,  req.session.username) 
				const {firstname, lastname, surname, id_house} = req.body 
				req.session.id_house = id_house 
				const sql1 = `insert into characters (username, lastname, firstname, surname, email, id_house) values ($1, $2, $3, $4, $5, $6);`

				await client.query(sql1, [req.session.username, lastname, firstname, surname, req.session.email, id_house])
				const result = await client.query('select id from characters where username = $1;', [req.session.username])
				const id_character = result.rows[0].id
				const pset = await client.query('select * from plan where id_house = $1;', [id_house])
				for(let row of pset.rows)
				{
					await client.query(`insert into gradebook (id_character, id_problemset, is_done, grade, is_checked)
					values ($1, $2, false, 0, false);`, [id_character, row.id_problemset])
				}

				const sql2 = `insert into presences 
				(id_lecture, id_character)  
				(select sl1.id_lecture, sl2.id_character from 
				(select id as id_lecture from lectures 
				where id_house = $1) as sl1 cross join 
				(select id as id_character from characters 
				where id=$2) as sl2);`
				await client.query(sql2, [id_house, id_character]);
				client.query('COMMIT');
			
				res.redirect('/character/gradebook') 
			} 
		} catch(err) 
		{ 
				res.send('Ошибка  добавления данных в базу. Error in registering') 
				console.log("Ошибка, добавления данных в базу. Error in registering", err) 
		} 
	} 
		

export {index, register}
