**User**

$ fog-controller user <command> <options>

**Command List**

 add              Add a new user.
 update           Update existing user.
 remove           Delete a user.
 list             List all users.
 generate-token   Generate token for a user.
 activate         Activate a user.
 suspend          Suspend a user.

add

 -f, --first-name string   User's first name
 -l, --last-name string    User's last name
 -e, --email string        User's email address
 -p, --password string     User's password

update

 -f, --first-name string   User's first name
 -l, --last-name string    User's last name
 -e, --email string        User's email address
 -p, --password string     User's password

remove

 -e, --email string   User's email address

generate-token

 -e, --email string   User's email address

activate

 -e, --email string   User's email address

suspend

 -e, --email string   User's email address
 
 **Example**
 
 node src/main.js user add -f test1 -l test2 -e test@gmail.com -p password1
