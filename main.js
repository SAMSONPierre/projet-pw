const express = require('express');
const serv= express();
var bodyParser = require('body-parser')
const pg = require('pg');
const session = require('express-session')


const pool = new pg.Pool({
user: 'postgres',
host: 'localhost',
database: 'ubereats',
password: 'post314', // à modifier
port: 5432
});

serv.use(session({
    // It holds the secret key for session
    secret: 'Your_Secret_Key',
    // Forces the session to be saved
    // back to the session store
    resave: true,
    // Forces a session that is "uninitialized"
    // to be saved to the store
    saveUninitialized: true
}));

var id = 0;
var entrees;
var pizzas;
var boissons;
var menus;
var ingredients;
var livraison;
var elem_livraison;
var size;
var commande = [];
var total = 0;
var name_sessions = "default";
var livreur;
var flag = false;
var livreur_dispo = [];
var commande_en_attente = [];
var livreur_pas_en_service = [];
var id_custom = 0;
var elem_custom;


pool.connect();
pool.query("SELECT * FROM entrees",(err,res)=>{
    if(!err){
        entrees = res.rows;
    }
    else{
        console.log(console.error);
    }
});

pool.query("SELECT * FROM size",(err,res)=>{
    if(!err){
        size = res.rows;
    }
    else{
        console.log(console.error);
    }
});


pool.query("SELECT * FROM pizzas",(err,res)=>{
    if(!err){
        pizzas = res.rows;
    }
    else{
        console.log(console.error);
    }
})

pool.query("SELECT * FROM menu",(err,res)=>{
    if(!err){
        menus = res.rows;
    }
    else{
        console.log(console.error);
    }
});

pool.query("SELECT * FROM boissons",(err,res)=>{
    if(!err){
        boissons = res.rows;
    }
    else{
        console.log(console.error);
    }
    
});

pool.query("SELECT * FROM elem_custom",(err,res)=>{
    if(!err){
        elem_custom = res.rows;
    }
    else{
        console.log(console.error);
    }
    
});

pool.query("SELECT * FROM elem_menu",(err,res)=>{
    if(!err){
        elem_menu = res.rows;
    }
    else{
        console.log(console.error);
    }

});

pool.query("SELECT * FROM livreur ",(err,res)=>{
    if(!err){
        livreur = res.rows;
    }
    else{
        console.log(console.error);
    }
    
});

pool.query("SELECT * FROM livraison ",(err,res)=>{
    if(!err){
        livraison = res.rows;
    }
    else{
        console.log(console.error);
    }
    
});

pool.query("SELECT * FROM elem_livraison ",(err,res)=>{
    if(!err){
        elem_livraison = res.rows;
    }
    else{
        console.log(console.error);
    }
    
});

pool.query("SELECT * FROM ingredients",(err,res)=>{
    if(!err){
        ingredients = res.rows;
    }
    else{
        console.log(console.error);
    }
    
});

pool.query("SELECT MAX(id_livraison) FROM livraison",(err,res)=>{
    if(!err){
        try{
            let c = res.rows[0].max;
            id = c+1;
        }
        catch{
            id = 0;
        }
    }
    else{
        console.log(console.error);
    }
});

pool.query("SELECT MAX(id_custom) FROM elem_custom",(err,res)=>{
    if(!err){
        try{
            let c = res.rows[0].max;
            id_custom = c+1;
        }
        catch{
            id_custom = 0;
        }
    }
    else{
        console.log(console.error);
    }
});
pool.query("SELECT MAX(id_menu) FROM elem_menu",(err,res)=>{
    if(!err){
        try{
            let c = res.rows[0].max;
            id_menu = c+1;
        }
        catch{
            id_menu = 0;
        }
    }
    else{
        console.log(console.error);
    }
});

serv.use(express.static('.'));
serv.use(bodyParser.json());
serv.use(bodyParser.urlencoded());

serv.get('/',function (req,res) {
    if(!flag){ getLivreurDispo(); flag = true;}
    res.render("Main.ejs",{entrees:entrees,boissons:boissons,pizzas:pizzas,ingredients:ingredients,size:size,menus:menus,name_sessions:name_sessions});
});

serv.get('/livraison',function(req,res) {
    queryForLivraison();
    res.render("livraison.ejs",{livraison:livraison,elem_livraison:elem_livraison,livreur:name_sessions,elem_custom:elem_custom,elem_menu:elem_menu});
});


serv.get('/connexion',function(req,res){
    res.render("connexion.ejs");
});

serv.post('/connexion',function(req,res){
    name_sessions = req.body.name;
    //console.log(livreur_pas_en_service);
    console.log("WELCOME " + name_sessions);
    pool.query("UPDATE livreur SET en_service = true WHERE nom = '" + name_sessions + "';");
    if(livreur_pas_en_service.includes(name_sessions)){
        var myIndex = livreur_pas_en_service.indexOf(name_sessions);
        if (myIndex !== -1) {
            livreur_pas_en_service.splice(myIndex, 1);
        }
        pool.query("UPDATE livreur SET en_service = true WHERE livreur.nom = '" + name_sessions +"';");
        attributeCommand();
    }
    else if(livreur_dispo.includes(name_sessions)){
        console.log("case livreur dispo");
        attributeCommand();
    }
    else{
        console.log("Vous avez une commande à livrer");
    }
    res.render("Main.ejs",{entrees:entrees,boissons:boissons,pizzas:pizzas,ingredients:ingredients,size:size,menus:menus,name_sessions:name_sessions});
});

serv.get('/inscription',function(req,res){
    res.render("inscription.ejs");
});

serv.post('/formulaire',function(req,res){
    let panier = req.body.panier;
    commande = [];
    total = 0;
    if(panier instanceof Array){
        //console.log(panier);
        
        panier.forEach(element => {
            let tab = element.split(" ");
            if(tab[0] === "custom" || tab[0] === "menu"){
                let cust = [];
                for(var i=0;i<tab.length;i++){
                    cust.push(tab[i]);
                }
                commande.push(cust);
                total+= parseInt(tab[cust.length-1]);
            }
            else{
                commande.push([tab[0],tab[1],tab[2],tab[3]]);
                total += parseInt(tab[3]);
            }
        });
        res.render('formulaire.ejs');
    }
    else{
        let tab = panier.split(" ");
        if(tab[0] === "custom" || tab[0] === "menu"){
            let cust = [];
                for(var i=0;i<tab.length;i++){
                    cust.push(tab[i]);
                }
                commande.push(cust);
                total+= parseInt(tab[cust.length-1]);
        }
        else{
            commande.push([tab[0],tab[1],tab[2],tab[3]]);
            total += parseInt(tab[3]);
        }
        res.render("formulaire.ejs");
        
    }
});

serv.post('/livraison',function(req,res){
    var id = req.body.livre;
    //console.log(req.body.livre);
    pool.query("DELETE FROM livraison WHERE id_livraison = " + id + ";");
    pool.query("DELETE FROM elem_livraison WHERE id_livraison = " + id + ";");
    pool.query("DELETE FROM elem_custom WHERE id_livraison = " + id + ";");
    pool.query("DELETE FROM elem_menu WHERE id_livraison = " + id +";");

    attributeCommand();
    res.render("Main.ejs",{entrees:entrees,boissons:boissons,pizzas:pizzas,ingredients:ingredients,size:size,menus:menus,name_sessions:name_sessions});
});

serv.post('/merci',function(req,res){
    var liv;
    if(livreur_dispo.length === 0){
        liv = "waiting";
        commande_en_attente.push(id);
    }
    else{
        liv = livreur_dispo[0];
        livreur_dispo.shift();
    }
    nom = req.body.nom + " " + req.body.prenom;
    adresse = req.body.adresse + " " + req.body.ville + " " + req.body.postal;
    pool.query("INSERT INTO livraison(id_livraison,adresse,nom,total,livreur) VALUES(" + id +",'" +adresse +"','"+nom + "'," + total + ",'"+ liv + "');");
    commande.forEach(element => {

        if(element[0] === "custom"){

            pool.query("INSERT INTO elem_livraison(id_livraison,type_plat,nom_plat,prix,x) VALUES(" + id +",'" + element[0] + "','" + element[2] + "','" + element[element.length-1] + "','" + id_custom +"');" );
            for(var i=3;i<element.length-1;i++){
                pool.query("INSERT INTO elem_custom(id_custom,id_livraison,nom) VALUES("+id_custom+","+ id +",'"+element[i]+"');");
            }
            id_custom++;
        }
        else if(element[0] === "menu"){
            pool.query("INSERT INTO elem_livraison(id_livraison,type_plat,nom_plat,prix,x) VALUES(" + id +",'" + element[0] + "','" + element[1] + "','" + element[element.length-1] + "','" + id_menu +"');");
            for(var i=2;i<element.length-1;i++){
                pool.query("INSERT INTO elem_menu(id_menu,id_livraison,nom) VALUES(" + id_menu + "," + id + ",'" + element[i] + "');");
            }
            id_menu++;
        }
        else{
            pool.query("INSERT INTO elem_livraison(id_livraison,type_plat,nom_plat,prix,x) VALUES(" + id +",'" + element[0] + "','" + element[1] + "','" + element[3] + "','" + element[2] +"');" );
        }
    });
    pool.query("UPDATE livreur SET flag = true WHERE livreur.nom = '"+ liv +"';");
    res.render("recap_com.ejs",{commande:commande,total:total,nom:nom,adresse:adresse,liv:liv});
    id++;
});
pool.end;
serv.listen(8080);

console.log("The server is now running at http://localhost:8080");

function attributeCommand(){
    if(commande_en_attente.length === 0 ){
        pool.query("UPDATE livreur SET flag = false WHERE livreur.nom = '"+ name_sessions +"';");
        livreur_dispo.push(name_sessions);
        console.log("Une commande vous sera bientôt attribuée");
    }
    else{
        var liv_id = commande_en_attente.shift();
        pool.query("UPDATE livraison SET livreur = '"+ name_sessions+ "' WHERE id_livraison = " +liv_id +";");
        console.log("La commande n°" + liv_id + " a été attribué à " + name_sessions);
    }
}

function queryForLivraison(){
    getLivraison()
    .then(res => {
        livraison = res;
    })
    .catch(error => { console.log(error)});
    getElemLivraison()
    .then(res => {
        elem_livraison = res;
    })
    .catch(error => { console.log(error)});
    getElemCustom()
    .then(res => {
        elem_custom = res;
    })
    .catch(error => { console.log(error)});
    getElemMenu()
    .then(res =>{
        elem_menu = res;
    })
    .catch(error => {console.log(error)});
}

function getLivreurDispo(){
    livreur.forEach(element => {
        if(!element.flag && element.en_service){
            livreur_dispo.push(element.nom);
        }
        else if(!element.en_service){
            livreur_pas_en_service.push(element.nom);
        }
    });
}
//TODO getElem(nom) pour concaténer ces 4 fonctions
function getElemCustom(){
    return promise = new Promise((resolve, reject) => {
        pool.query("SELECT * FROM elem_custom",(err,res)=>{
            if(!err){
                resolve(res.rows);
            }
            else{
                reject(err);
            }
        });
    });
}
function getElemMenu(){
    return promise = new Promise((resolve, reject) => {
        pool.query("SELECT * FROM elem_menu",(err,res)=>{
            if(!err){
                resolve(res.rows);
            }
            else{
                reject(err);
            }
        });
    });
}

function getElemLivraison(){
    return promise = new Promise((resolve, reject) => {
        pool.query("SELECT * FROM elem_livraison",(err,res)=>{
            if(!err){
                resolve(res.rows);
            }
            else{
                reject(err);
            }
        });
    });
}

function getLivraison(){
    return promise = new Promise((resolve, reject) => {
        pool.query("SELECT * FROM livraison",(err,res)=>{
            if(!err){
                resolve(res.rows);
            }
            else{
                reject(err);
            }
        });
    });


}