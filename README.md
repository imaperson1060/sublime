# sub·lime
/səˈblīm/

_adjective_
<br>
&nbsp;&nbsp;of such excellence, grandeur, or beauty as to inspire great admiration or awe.

**How to use**
<br>
That's the beauty of it, you don't need to do anything! Sublime is hosted for free at [sublime.imaperson.dev](https://sublime.imaperson.dev).

**Usage**
<br>
In the Sublime Panel, click the "Add New" button, enter your public URL and encryption key, and you're in! Sublime doesn't have a backend, so you'll have to re-log in on other browsers/computers. If you have 2FA (2 factor authentication), it will be stored on your Limelight database, not Sublime.

**Self-Host**
<br>
If you cannot port forward your Limelight database, or are not comfortable with it, good news! Sublime is bundled by default with Limelight (starting in version 3.1.0), and can be accessed on the port your database is open to. Sublime will automatically be updated when your database is started, so you don't have to worry about that, either! (Or, y'know, just get it from its [GitHub](https://github.com/imaperson1060/sublime))

**WARNING**
Sublime, and by extension the Limelight server are vulnerable to remote code execution attacks. Limelight filters for queries such as `select` and `delete` are normal JavaScript functions, so anyone can run code from your computer if they have your encryption key! Use [passwordsgenerator.net](https://passwordsgenerator.net) to generate a secure, random key to use in your database, and ALWAYS store it in a `.env` file ([dotenv](https://npm.im/dotenv)).