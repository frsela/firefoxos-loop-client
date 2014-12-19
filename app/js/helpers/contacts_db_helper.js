// This manages all contacts changes and calls ActionLogDB and RoomsDB to update them

(function() {
  'use strict';

  var _contactsCache = false;

  function debug(msg, obj) {
var debug = true;
    if (debug) {
      if (obj) {
        msg += ' ' + JSON.stringify(obj);
      }
      console.log('ContactsDBHelper: ' + msg);
    }
  }

  function error(msg) {
    console.error('ContactsDBHelper: ' + msg);
  }

  /**
   * We store a revision number for the contacts data local cache that we need
   * to keep synced with the Contacts API database.
   * This method stores the revision of the Contacts API database and it will
   * be called after refreshing the local cache because of a contact updated,
   * a contact deletion or a cache sync.
   */
  function _updateCacheRevision() {
    navigator.mozContacts.getRevision().onsuccess = function(event) {
      var contactsRevision = event.target.result;
      if (contactsRevision) {
        debug('_updateCacheRevision - ' + contactsRevision);
        window.asyncStorage.setItem('contactsCacheRevision', contactsRevision);
      }
    };
  }

  function _registerToContactsChanges() {
    debug('_registerToContactsChanges: Registering...');
    navigator.mozContacts.oncontactchange = function oncontactchange_handler(event) {
      var reason = event.reason;
      var contactId = event.contactID;
      debug('_registerToContactsChanges - oncontactchange_handler: ' + reason + ' - ' + contactId);

      if (reason == 'remove') {
        ActionLogDB.removeContactInfo(contactId);
        CallLog.updateListWithContactInfo('remove', contactId);
        return;
      }
      ContactsHelper.find({
        contactId: contactId
      }, function(contactInfo) {
        debug('ContactsHelper resolve:',contactInfo);
        ActionLogDB.updateContactInfo(contactInfo.contacts[0]);
        CallLog.updateListWithContactInfo(reason, contactInfo.contacts[0]);
      }, function() {
        error('ContactsHelper reject - Could not retrieve contact ' +
              'after getting oncontactchange: ' + contactId);
        ActionLogDB.removeContactInfo(contactId);
      });

      _updateCacheRevision();
    };
  }

  // This is called from calllog.js when rendering in renderLogs is rejected
  function _verifyContactsCache() {
    debug('_verifyContactsCache - starting ...');
    return new Promise(function (resolve, reject) {
      // Get the latest contacts cache revision and the actual Contacts API
      // db revision. If both values differ, we need to update the contact
      // cache and its revision and directly query the Contacts API to render
      // the appropriate information while the cache is being rebuilt.
      window.asyncStorage.getItem('contactsCacheRevision', (cacheRevision) => {
        debug('_verifyContactsCache - contactsCacheRevision = ' + cacheRevision);
        var req = navigator.mozContacts.getRevision();

        req.onsuccess = function(event) {
          var contactsRevision = event.target.result;
          debug('_verifyContactsCache - contactsRevision = ' + contactsRevision);

          // We don't need to sync if this is the first time that we use the
          // action log.
          if (!cacheRevision) {
            debug('_verifyContactsCache: No contactsRevision cached, ' +
                  'we don\'t need to sync');
            _updateCacheRevision();
            reject();
            return;
          }

          var cacheIsValid = _contactsCache = (cacheRevision === contactsRevision);
          if (cacheIsValid) {
            debug('_verifyContactsCache: No changes on contacts. ' +
                  'We don\'t need to sync');
            reject();
            return;
          }

          // Cache is not valid since cached revision is different to current contactsRevision
          Promise.all([
            ActionLogDB.invalidateContactsCache,
          ]).then(() => {
            debug('_verifyContactsCache - All promises resolved. ' +
                  'Contacts updated on all DBs');
            _contactsCache = true;
            _updateCacheRevision();
            resolve();
          }, error => {
            error('_verifyContactsCache - Some promises rejected. ' +
                  'Contacts not updated in all DBs - ' + error);
            _updateCacheRevision();
// FRS: Aqui algunas pudieron cumplirse ... ¿deberíamos lanzar resolve?
            reject();
          });
        };

        req.onerror = (event) => {
          error('Could not get mozContacts revision - ' + event.target.errorCode);
        };
      });
    });
  }


  function _init() {
    debug('Initializing...');
    _registerToContactsChanges();
  }

  window.ContactsDBHelper = {
    init: _init,
    verifyContactsCache: _verifyContactsCache
  };
}());

// FRS: Se inicializa en init de CallLog ... pero ¿deberíamos hacerlo cuando esten tb. inicializadas las bbdd?
