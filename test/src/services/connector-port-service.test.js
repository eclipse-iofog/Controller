// TODO finish with qs.stringify mock EWC-452
// describe('.openPortOnRandomConnector()', () => {
//   const transaction = {};
//   const error = 'Error!';
//
//   const isPublicAccess = false;
//
//   const connectors = [
//     {
//       id: 15
//     },
//     {
//       id: 16
//     }
//   ];
//
//   def('subject', () => $subject.openPortOnRandomConnector(isPublicAccess, transaction));
//   def('findConnectorsResponse', () => Promise.resolve(connectors));
//   def('stringifyResponse', () => Promise.resolve());
//
//   beforeEach(() => {
//     $sandbox.stub(ConnectorManager, 'findAll').returns($findConnectorsResponse);
//     $sandbox.stub(qs, 'stringify').returns($stringifyResponse);
//   });
//
//   it('calls ConnectorManager#findAll() with correct args', async () => {
//     await $subject;
//     expect(ConnectorManager.findAll).to.have.been.calledWith({}, transaction);
//   });
//
//   context('when ConnectorManager#findAll() fails', () => {
//     def('findConnectorsResponse', () => Promise.reject(error));
//
//     it(`fails with ${error}`, () => {
//       return expect($subject).to.be.rejectedWith(error)
//     })
//   });
//
//   context('when ConnectorManager#findAll() succeeds', () => {
//     it('calls qs#stringify() with correct args', async () => {
//       await $subject;
//       expect(qs.stringify).to.have.been.calledWith({
//         mapping: '{"type":"public","maxconnections":60,"heartbeatabsencethreshold":200000}'
//       });
//     });
//
//     context('when qs#stringify() fails', () => {
//       def('stringifyResponse', () => error);
//
//       it(`fails with ${error}`, () => {
//         return expect($subject).to.eventually.equal(undefined)
//       })
//     });
//
//     context('when qs#stringify() succeeds', () => {
//       it('fulfills the promise', () => {
//         return expect($subject).to.eventually.equal(undefined)
//       })
//     })
//   })
// });
